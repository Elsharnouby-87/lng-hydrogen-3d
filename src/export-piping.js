import { R101_H2_OUTLET } from './coldbox-assembly.js';
import {
  BLUE, MINT, blue, box, cyl, flange, group, pad, pipeBlue, pipeMint,
  sphere, steel, trim, v,
} from './plant-geometry.js';

export const separatorLocation = [13.65, 0, -4.95];
export const sendOutLocation = [-17.80, 0, 5.78];

export function addExportPiping(common, route, { refrigeration, lh2, vaporizer }) {
  const [separatorX, , separatorZ] = separatorLocation;
  const separator = group(common, ...separatorLocation);
  separator.name = 'Phase separator';
  const inletY = R101_H2_OUTLET[1];
  const outletY = .75;
  const nozzleX = .43;
  pad(separator, 0, 0, .79, .78);
  cyl(separator, 0, .44, 0, .22, .64, trim);
  cyl(separator, 0, 1.19, 0, .30, .98, steel);
  for (const y of [.70, 1.68]) sphere(separator, 0, y, 0, .30, .13, .30, steel);
  for (const [side, y] of [[-1, inletY], [1, outletY]]) {
    cyl(separator, side * .33, y, 0, .129, .20, blue, 'x', true);
    flange(separator, side * .40, y, 0, .184, 'x', steel, 6);
  }

  const coldBoxOutlet = refrigeration.root.position.clone().add(v(...R101_H2_OUTLET)).toArray();
  const tankInlet = lh2.position.clone().add(v(...lh2.userData.processPorts[0].point)).toArray();
  const [tankX, tankY, tankZ] = tankInlet;
  const riseX = tankX - .70;
  const feed = route(common, [
    coldBoxOutlet, [separatorX - nozzleX, inletY, separatorZ],
  ], pipeBlue, BLUE, 5, .103, .73);
  const delivery = route(common, [
    [separatorX + nozzleX, outletY, separatorZ], [riseX, outletY, separatorZ],
    [riseX, tankY, tankZ], tankInlet,
  ], pipeBlue, BLUE, 10, .103, .80);

  const [meterX, , meterZ] = sendOutLocation;
  const meter = group(common, ...sendOutLocation);
  meter.name = 'Gas send-out metering run';
  pad(meter, -.20, 0, 4.60, 2.58);
  const meterY = .55;
  const boundaryX = -.88;
  for (const x of [-.50, .48]) {
    box(meter, x, .30, 0, .27, .35, .33, trim);
    box(meter, x, .459, 0, .33, .08, .38, steel);
  }
  cyl(meter, 0, meterY, 0, .168, .45, steel, 'x');
  for (const x of [-.26, .26]) flange(meter, x, meterY, 0, .187, 'x', steel, 6);
  cyl(meter, 0, .79, 0, .044, .21, steel, 'y', true);
  box(meter, 0, .97, 0, .24, .18, .20, trim);
  box(meter, 0, .98, .104, .16, .09, .016, steel);
  cyl(meter, boundaryX, .151, 0, .168, .068, trim, 'y', true);

  const sendOutPort = vaporizer.userData.processPorts.find(port => port.name === 'Gas send-out');
  const gasOutlet = vaporizer.position.clone().add(v(...sendOutPort.point)).toArray();
  const dropX = meterX + 1.32;
  const gas = route(common, [
    gasOutlet, [dropX, gasOutlet[1], meterZ], [dropX, meterY, meterZ],
    [meterX + boundaryX, meterY, meterZ], [meterX + boundaryX, .13, meterZ],
  ], pipeMint, MINT, 16);
  return [feed, delivery, gas];
}
