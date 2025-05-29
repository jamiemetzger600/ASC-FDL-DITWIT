// web-app/src/data_example/camera_data/red-example.ts
// Example data structure for RED cameras.
// This is for demonstration purposes and is NOT part of the active application code.

// Assuming the CameraManufacturer interface is defined elsewhere (e.g., in a types file or arri-example.ts for this demo)
// For a real implementation, you'd import a shared type.
// import type { CameraManufacturer } from '../../types/cameras'; 

// Re-defining for simplicity in this isolated example, or use the one from arri-example.ts if it were a real module structure.
interface Resolution {
  name: string;
  width: number;
  height: number;
}

interface CameraModel {
  name: string;
  resolutions: Resolution[];
}

export interface CameraManufacturer {
  name: string;
  models: CameraModel[];
}

export const RED_EXAMPLE_DATA: CameraManufacturer = {
  name: "RED",
  models: [
    {
      name: "V-RAPTOR 8K S35 (Spherical Example)",
      resolutions: [
        { name: "8K 17:9", width: 8192, height: 4320 },
        { name: "8K 2:1", width: 8192, height: 4096 },
      ],
    },
    {
      name: "V-Raptor 8K VV (Spherical Example)",
      resolutions: [
        { name: "8K 17:9", width: 8192, height: 4320 },
      ],
    },
  ],
}; 