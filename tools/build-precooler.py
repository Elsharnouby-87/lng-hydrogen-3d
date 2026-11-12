"""Build the illustrative E-101 inspection asset with Blender's glTF exporter."""
import math
import sys
from pathlib import Path

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
parts = {}

def material(name, color, metal, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    return mat

aluminium = material("Brushed aluminium", (.55, .62, .67), .83, .29)
steel = material("Machined stainless", (.40, .45, .49), .91, .23)
housing = material("Insulated cladding", (.33, .41, .46), .51, .43)
frame = material("Coated steel", (.045, .075, .095), .50, .48)
seal = material("Gasket", (.029, .039, .045), .1, .76)
blue = material("Hydrogen identification", (.024, .29, .53), .45, .34)
green = material("LNG identification", (.019, .35, .24), .45, .38)

def finish(obj, group, mat, bevel=0, smooth=False):
    obj.data.materials.append(mat)
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = len(face.vertices) == 4
    if bevel:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new("Machined edge", "BEVEL")
        modifier.width, modifier.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        normals = obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=normals.name)
    parts.setdefault((group, mat.name), []).append(obj)

def box(group, mat, x, y, z, width, height, depth, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    obj = bpy.context.object
    obj.scale = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, group, mat, bevel)

def cylinder(group, mat, x, y, z, radius, length, sides=24, bevel=0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=sides, radius=radius, depth=length, location=(x, -z, y),
        rotation=(0, math.pi/2, 0)
    )
    finish(bpy.context.object, group, mat, bevel, smooth=sides > 8)

# Cladding and access covers are a separate assembly so sectioning can expose the core.
for side in [-1, 1]:
    for i in range(6):
        x = (i - 2.5) * 1.12
        box("Shell", housing, x, 1.96, side * 1.75, 1.107, 1.93, .14, .018)
        for y in [1.08, 2.82]:
            box("Shell", steel, x, y, side * 1.829, 1.097, .039, .024, .006)
    box("Shell", frame, 0, 2.975, side * 1.75, 6.82, .077, .16, .013)
for i in range(6):
    x = (i - 2.5) * 1.12
    box("Shell", housing, x, 3.016, 0, 1.106, .14, 3.63, .023)
    box("Shell", aluminium, x - .48, 3.108, 0, .046, .065, 3.52, .009)
box("Shell", aluminium, -.87, 1.67, 1.852, 1.02, 1.13, .067, .026)
for y in [1.31, 2.04]:
    box("Shell", frame, -.47, y, 1.899, .085, .116, .041, .006)

# End chambers, gasket faces, and circumferential bolt sets.
for side in [-1, 1]:
    box("Headers", aluminium, side*3.30, 1.95, 0, .24, 1.99, 3.47, .056)
    for z in [-1.02, 1.02]:
        cylinder("Headers", aluminium, side*3.50, 1.38, z, .30, .42, 32, .024)
        cylinder("Headers", steel, side*3.76, 1.38, z, .405, .105, 36, .012)
        cylinder("Headers", seal, side*3.818, 1.38, z, .352, .019, 32)
        cylinder("Headers", steel, side*3.854, 1.38, z, .395, .060, 36, .007)
        cylinder("Headers", blue if z < 0 else green, side*3.625, 1.38, z, .302, .043, 24)
        for i in range(10):
            a = i * math.tau / 10
            by, bz = 1.38 + math.sin(a)*.322, z + math.cos(a)*.322
            cylinder("Headers", frame, side*3.899, by, bz, .032, .036, 6)
            cylinder("Headers", steel, side*3.691, by, bz, .032, .036, 6)

# Representative alternating passages. The pitch is enlarged for inspection.
for i in range(7):
    y = 1.00 + i*.306
    fluid = blue if i % 2 == 0 else green
    group = "Hydrogen" if i % 2 == 0 else "LNG"
    box("Core", aluminium, 0, y+.014, 0, 6.45, .066, 3.03, .011)
    for side in [-1, 1]:
        box("Core", aluminium, 0, y+.112, side*1.465, 6.43, .147, .085, .007)
    for j in range(27):
        z = (j-13)*.102
        box(group, fluid, 0, y+.072, z, 4.70, .020, .067)
        box("Core", aluminium, 0, y+.139, z+.045, 4.70, .118, .018)
    for side in [-1, 1]:
        box(group, fluid, side*2.76, y+.069, 0, .83, .025, 2.74)
        for j in range(11):
            z = (j-5)*.227
            x1, z1, x2, z2 = side*3.18, z*.39, side*2.36, z
            box("Core", aluminium, (x1+x2)/2, y+.135, (z1+z2)/2,
                math.hypot(x2-x1, z2-z1), .091, .023)
            bpy.context.object.rotation_euler.z = math.atan2(-(z2-z1), x2-x1)

for (group, _), objects in parts.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = group
    obj["assembly"] = group

out = Path(sys.argv[sys.argv.index("--")+1]).resolve()
bpy.ops.export_scene.gltf(filepath=str(out), export_format="GLB", export_extras=True)
