// web-app/src/data_example/camera-data-importer-example.ts
// Example of how to import and combine camera data from separate files.
// This is for demonstration purposes and is NOT part of the active application code.

import { ARRI_EXAMPLE_DATA, type CameraManufacturer as ArriCameraManufacturer } from './camera_data/arri-example';
import { RED_EXAMPLE_DATA, type CameraManufacturer as RedCameraManufacturer } from './camera_data/red-example';

// If CameraManufacturer types are identical, you can use one. 
// If they might diverge or to be explicit, you can use type assertion or a shared type.
// For this example, assuming they are structurally compatible for CameraManufacturer[].

const COMBINED_CAMERA_DATA_EXAMPLE: (ArriCameraManufacturer | RedCameraManufacturer)[] = [
  ARRI_EXAMPLE_DATA,
  RED_EXAMPLE_DATA,
  // ... you would import and add SONY_EXAMPLE_DATA, etc.
];

// You could then use COMBINED_CAMERA_DATA_EXAMPLE in a similar way to your current CAMERA_DATA
console.log('Combined Example Camera Data:', JSON.stringify(COMBINED_CAMERA_DATA_EXAMPLE, null, 2));

// To make it strictly typed to a single shared interface (ideal approach):
// 1. Define a shared CameraManufacturer interface (e.g., in '../types/cameras.ts')
//    export interface Resolution { name: string; width: number; height: number; }
//    export interface CameraModel { name: string; resolutions: Resolution[]; }
//    export interface CameraManufacturer { name: string; models: CameraModel[]; }
// 2. Import this shared interface in each camera data file (arri-example.ts, red-example.ts)
//    import type { CameraManufacturer } from '../../types/cameras'; // Adjust path as needed
//    export const ARRI_EXAMPLE_DATA: CameraManufacturer = { ... };
// 3. Then this importer file would be simpler:
//    import type { CameraManufacturer } from '../types/cameras'; // Adjust path
//    import { ARRI_EXAMPLE_DATA } from './camera_data/arri-example';
//    import { RED_EXAMPLE_DATA } from './camera_data/red-example';
//    const ALL_CAMERA_DATA: CameraManufacturer[] = [ARRI_EXAMPLE_DATA, RED_EXAMPLE_DATA];
//    console.log(ALL_CAMERA_DATA);

export default COMBINED_CAMERA_DATA_EXAMPLE; 