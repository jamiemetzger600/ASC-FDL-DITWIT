// web-app/src/data_example/camera_data/arri-example.ts
// Example data structure for ARRI cameras.
// This is for demonstration purposes and is NOT part of the active application code.

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

export const ARRI_EXAMPLE_DATA: CameraManufacturer = {
  name: "ARRI",
  models: [
    {
      name: "ALEXA 35 (Example)",
      resolutions: [
        { name: "4.6K 3:2 Open Gate", width: 4608, height: 3164 },
        { name: "4.6K 16:9", width: 4608, height: 2592 },
      ],
    },
    {
      name: "ALEXA Mini LF (Example)",
      resolutions: [
        { name: "4.5K LF Open Gate", width: 4448, height: 3096 },
      ],
    },
  ],
}; 