import type { FramingIntent, Canvas, FramingDecision } from '../types/fdl';

/**
 * Core mathematical utilities for accurate FDL calculations
 */

/**
 * ASC FDL Rounding Types as per specification
 */
export type RoundEven = 'whole' | 'even';
export type RoundMode = 'up' | 'down' | 'round';

export interface RoundingConfig {
  even: RoundEven;
  mode: RoundMode;
}

/**
 * Default rounding configuration as per ASC FDL spec
 */
export const DEFAULT_ROUNDING: RoundingConfig = {
  even: 'even',
  mode: 'up'
};

/**
 * Apply ASC FDL compliant rounding to a number
 * @param value - The number to round
 * @param config - Rounding configuration
 * @returns Rounded number according to ASC FDL spec
 */
export function applyASCRounding(value: number, config: RoundingConfig = DEFAULT_ROUNDING): number {
  if (!isFinite(value)) return 0;
  
  let rounded: number;
  
  // First apply the mode rounding
  switch (config.mode) {
    case 'up':
      rounded = Math.ceil(value);
      break;
    case 'down':
      rounded = Math.floor(value);
      break;
    case 'round':
    default:
      rounded = Math.round(value);
      break;
  }
  
  // Then apply even/whole constraint
  if (config.even === 'even') {
    // Force to nearest even number
    if (rounded % 2 !== 0) {
      // If the number is odd, adjust based on the mode
      switch (config.mode) {
        case 'up':
          rounded += 1; // Round odd up to next even
          break;
        case 'down':
          rounded -= 1; // Round odd down to previous even
          break;
        case 'round':
        default:
          // Round to nearest even (could be up or down)
          const nextEven = rounded + 1;
          const prevEven = rounded - 1;
          rounded = Math.abs(value - nextEven) < Math.abs(value - prevEven) ? nextEven : prevEven;
          break;
      }
    }
  }
  
  // Ensure we don't return negative values or zero for dimensions
  return Math.max(2, rounded);
}

/**
 * Apply rounding to both width and height dimensions
 */
export function applyRoundingToDimensions(
  width: number, 
  height: number, 
  config: RoundingConfig = DEFAULT_ROUNDING
): { width: number; height: number } {
  return {
    width: applyASCRounding(width, config),
    height: applyASCRounding(height, config)
  };
}

/**
 * Calculate the exact frame dimensions for a given aspect ratio within canvas bounds
 * This ensures pixel-perfect calculations without floating point errors
 * Now supports ASC FDL compliant rounding
 */
export function calculateExactFrameDimensions(
  canvasWidth: number,
  canvasHeight: number,
  aspectRatioWidth: number,
  aspectRatioHeight: number,
  roundingConfig: RoundingConfig = DEFAULT_ROUNDING
): { width: number; height: number } {
  if (canvasWidth <= 0 || canvasHeight <= 0 || aspectRatioWidth <= 0 || aspectRatioHeight <= 0) {
    throw new Error('Invalid dimensions or aspect ratio');
  }

  const targetAspectRatio = aspectRatioWidth / aspectRatioHeight;
  const canvasAspectRatio = canvasWidth / canvasHeight;

  let frameWidth: number;
  let frameHeight: number;

  if (canvasAspectRatio > targetAspectRatio) {
    // Canvas is wider than target - letterbox (fit to height)
    frameHeight = canvasHeight;
    frameWidth = canvasHeight * targetAspectRatio;
  } else if (canvasAspectRatio < targetAspectRatio) {
    // Canvas is narrower than target - pillarbox (fit to width)
    frameWidth = canvasWidth;
    frameHeight = canvasWidth / targetAspectRatio;
  } else {
    // Exact match
    frameWidth = canvasWidth;
    frameHeight = canvasHeight;
  }

  // Apply ASC FDL compliant rounding
  return applyRoundingToDimensions(frameWidth, frameHeight, roundingConfig);
}

/**
 * Calculate frame dimensions with protection (padding) using ASC FDL rounding
 */
export function calculateFrameWithProtection(
  baseWidth: number,
  baseHeight: number,
  protectionPercent: number,
  roundingConfig: RoundingConfig = DEFAULT_ROUNDING
): { 
  width: number; 
  height: number; 
  offsetX: number; 
  offsetY: number;
  originalWidth: number;
  originalHeight: number;
} {
  if (protectionPercent <= 0 || protectionPercent >= 100) {
    return {
      width: baseWidth,
      height: baseHeight,
      offsetX: 0,
      offsetY: 0,
      originalWidth: baseWidth,
      originalHeight: baseHeight
    };
  }

  const scaleFactor = 1.0 - (protectionPercent / 100.0);
  
  // Calculate protected dimensions with proper rounding
  const protectedDimensions = applyRoundingToDimensions(
    baseWidth * scaleFactor,
    baseHeight * scaleFactor,
    roundingConfig
  );
  
  // Calculate offsets (padding) with rounding to ensure even centering
  const offsetX = applyASCRounding((baseWidth - protectedDimensions.width) / 2, roundingConfig);
  const offsetY = applyASCRounding((baseHeight - protectedDimensions.height) / 2, roundingConfig);

  return {
    width: protectedDimensions.width,
    height: protectedDimensions.height,
    offsetX,
    offsetY,
    originalWidth: baseWidth,
    originalHeight: baseHeight
  };
}

/**
 * Calculate anamorphic desqueeze dimensions with proper rounding
 * This handles the horizontal stretching for anamorphic lenses
 */
export function calculateAnamorphicDimensions(
  width: number,
  height: number,
  squeezeFactorX: number,
  squeezeFactorY: number = 1.0,
  roundingConfig: RoundingConfig = DEFAULT_ROUNDING
): { width: number; height: number } {
  if (squeezeFactorX <= 0 || squeezeFactorY <= 0) {
    throw new Error('Invalid squeeze factors');
  }
  
  const desqueezedWidth = width * squeezeFactorX;
  const desqueezedHeight = height * squeezeFactorY;
  
  return applyRoundingToDimensions(desqueezedWidth, desqueezedHeight, roundingConfig);
}

/**
 * Calculate sensor information for display
 */
export function calculateSensorInfo(
  photosites: { width: number; height: number },
  physicalDimensions: { width: number; height: number }
): {
  pixelPitch: number;
  photositeCount: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  imageCircleMm: number;
} {
  const pixelPitch = physicalDimensions.width / photosites.width; // mm per pixel
  const photositeCount = photosites.width * photosites.height;
  const sensorWidthMm = physicalDimensions.width;
  const sensorHeightMm = physicalDimensions.height;
  
  // Image circle is the diagonal of the sensor
  const imageCircleMm = Math.sqrt(
    sensorWidthMm * sensorWidthMm + sensorHeightMm * sensorHeightMm
  );

  return {
    pixelPitch,
    photositeCount,
    sensorWidthMm,
    sensorHeightMm,
    imageCircleMm
  };
}

/**
 * Format numbers for display with appropriate precision
 */
export function formatNumberForDisplay(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

/**
 * Calculate precise aspect ratio value from width/height ratio
 */
export function calculatePreciseAspectRatio(width: number, height: number): number {
  if (height === 0) return 0;
  return width / height;
}

export function calculateFramingDecisionGeometry(
  intent: FramingIntent,
  canvas: Canvas,
  roundingConfig: RoundingConfig = DEFAULT_ROUNDING
): Omit<FramingDecision, 'id' | 'label' | 'framing_intent_id'> | null {
  if (!canvas.dimensions || canvas.dimensions.width <= 0 || canvas.dimensions.height <= 0) {
    return null;
  }
  if (!intent.aspect_ratio || intent.aspect_ratio.width <= 0 || intent.aspect_ratio.height <= 0) {
    return null;
  }

  const canvasWidth = canvas.dimensions.width;
  const canvasHeight = canvas.dimensions.height;

  // Use the new precise calculation method with rounding
  const frameDimensions = calculateExactFrameDimensions(
    canvasWidth,
    canvasHeight,
    intent.aspect_ratio.width,
    intent.aspect_ratio.height,
    roundingConfig
  );

  const decisionWidth = frameDimensions.width;
  const decisionHeight = frameDimensions.height;
  
  // Apply rounding to anchor points as well
  const anchorPoint = applyRoundingToDimensions(
    (canvasWidth - decisionWidth) / 2,
    (canvasHeight - decisionHeight) / 2,
    roundingConfig
  );

  const geometry: Omit<FramingDecision, 'id' | 'label' | 'framing_intent_id'> = {
    dimensions: { width: decisionWidth, height: decisionHeight },
    anchor_point: { x: anchorPoint.width, y: anchorPoint.height },
  };

  // Handle protection if defined
  if (intent.protection !== undefined && intent.protection > 0 && intent.protection < 100) {
    const protectionResult = calculateFrameWithProtection(
      decisionWidth,
      decisionHeight,
      intent.protection,
      roundingConfig
    );

    geometry.protection_dimensions = {
      width: protectionResult.width,
      height: protectionResult.height,
    };
    
    geometry.protection_anchor_point = {
      x: anchorPoint.width + protectionResult.offsetX,
      y: anchorPoint.height + protectionResult.offsetY,
    };
  }

  return geometry;
}

/**
 * Test function to verify calculations match expected results
 * This can be called from the browser console for debugging
 */
export function testCalculations() {
  console.log('=== FDL Geometry Calculation Tests with ASC FDL Rounding ===');
  
  // Test cases covering different camera manufacturers and sensor sizes
  const testCases = [
    // Sony VENICE 2 8K - from user's image
    {
      name: "Sony VENICE 2 8K - 2:1 Aspect Ratio",
      sensorWidth: 8640,
      sensorHeight: 4556,
      aspectRatio: { width: 2, height: 1 },
      expectedWidth: 8640,
      expectedHeight: 4320
    },
    // ARRI ALEXA 35
    {
      name: "ARRI ALEXA 35 - 16:9 Aspect Ratio",
      sensorWidth: 4608,
      sensorHeight: 3164,
      aspectRatio: { width: 16, height: 9 },
      expectedWidth: 4608,
      expectedHeight: 2592
    },
    // RED V-Raptor 8K
    {
      name: "RED V-Raptor 8K - 2.39:1 Aspect Ratio",
      sensorWidth: 8192,
      sensorHeight: 4320,
      aspectRatio: { width: 239, height: 100 },
      expectedWidth: 8192,
      expectedHeight: 3430 // 8192 / 2.39 ≈ 3430
    },
    // Square aspect ratio test
    {
      name: "Square Format Test",
      sensorWidth: 4096,
      sensorHeight: 3072,
      aspectRatio: { width: 1, height: 1 },
      expectedWidth: 3072,
      expectedHeight: 3072
    },
    // Portrait aspect ratio test
    {
      name: "Portrait 9:16 Test",
      sensorWidth: 1920,
      sensorHeight: 1080,
      aspectRatio: { width: 9, height: 16 },
      expectedWidth: 608, // 1080 * (9/16) ≈ 608
      expectedHeight: 1080
    }
  ];
  
  let allTestsPassed = true;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    console.log(`Sensor: ${testCase.sensorWidth} × ${testCase.sensorHeight}`);
    console.log(`Target Aspect Ratio: ${testCase.aspectRatio.width}:${testCase.aspectRatio.height}`);
    
    const result = calculateExactFrameDimensions(
      testCase.sensorWidth,
      testCase.sensorHeight,
      testCase.aspectRatio.width,
      testCase.aspectRatio.height,
      DEFAULT_ROUNDING
    );
    
    const actualAspectRatio = calculatePreciseAspectRatio(result.width, result.height);
    const expectedAspectRatio = calculatePreciseAspectRatio(testCase.aspectRatio.width, testCase.aspectRatio.height);
    
    console.log(`Calculated: ${result.width} × ${result.height}`);
    console.log(`Expected: ~${testCase.expectedWidth} × ${testCase.expectedHeight}`);
    console.log(`Actual aspect ratio: ${formatNumberForDisplay(actualAspectRatio, 6)}`);
    console.log(`Expected aspect ratio: ${formatNumberForDisplay(expectedAspectRatio, 6)}`);
    
    // Check if aspect ratio is correct (within 0.001 tolerance)
    const aspectRatioError = Math.abs(actualAspectRatio - expectedAspectRatio);
    const aspectRatioCorrect = aspectRatioError < 0.001;
    
    console.log(`✓ Aspect Ratio: ${aspectRatioCorrect ? 'PASS' : 'FAIL'} (error: ${aspectRatioError.toFixed(6)})`);
    
    if (!aspectRatioCorrect) {
      allTestsPassed = false;
    }
    
    // Test protection calculations
    if (index === 0) { // Only test protection on first case to keep output clean
      console.log(`\n  Testing 10% protection:`);
      const protectionResult = calculateFrameWithProtection(result.width, result.height, 10, DEFAULT_ROUNDING);
      console.log(`  Protected size: ${protectionResult.width} × ${protectionResult.height}`);
      console.log(`  Offset: (${protectionResult.offsetX}, ${protectionResult.offsetY})`);
      
      // Verify protection calculations
      const expectedProtectedWidth = Math.round(result.width * 0.9);
      const expectedProtectedHeight = Math.round(result.height * 0.9);
      const protectionCorrect = protectionResult.width === expectedProtectedWidth && 
                               protectionResult.height === expectedProtectedHeight;
      
      console.log(`  ✓ Protection: ${protectionCorrect ? 'PASS' : 'FAIL'}`);
      if (!protectionCorrect) allTestsPassed = false;
    }
  });
  
  // Test sensor info calculation
  console.log(`\n--- Sensor Information Test ---`);
  const physicalDims = { width: 35.9, height: 24.0 }; // Sony VENICE 2 8K sensor
  const photosites = { width: 8640, height: 4556 };
  
  const sensorInfo = calculateSensorInfo(photosites, physicalDims);
  
  console.log(`Pixel pitch: ${formatNumberForDisplay(sensorInfo.pixelPitch, 5)} mm`);
  console.log(`Photosite count: ${sensorInfo.photositeCount.toLocaleString()}`);
  console.log(`Image circle: ${formatNumberForDisplay(sensorInfo.imageCircleMm)} mm`);
  
  // Verify pixel pitch calculation (should be physical width / pixel width)
  const expectedPixelPitch = physicalDims.width / photosites.width;
  const pixelPitchCorrect = Math.abs(sensorInfo.pixelPitch - expectedPixelPitch) < 0.000001;
  console.log(`✓ Pixel Pitch: ${pixelPitchCorrect ? 'PASS' : 'FAIL'}`);
  
  if (!pixelPitchCorrect) allTestsPassed = false;
  
  console.log(`\n=== Overall Test Result: ${allTestsPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'} ===`);
  
  // Additional ASC FDL Rounding Demonstration
  console.log(`\n--- ASC FDL Rounding Behavior Test ---`);
  console.log(`Testing different rounding configurations:`);
  
  const testValue = 1919.7; // A value that would normally round to odd (1920)
  
  const roundingConfigs = [
    { even: 'whole' as RoundEven, mode: 'round' as RoundMode, name: 'Standard Round' },
    { even: 'even' as RoundEven, mode: 'up' as RoundMode, name: 'Even + Up (Default)' },
    { even: 'even' as RoundEven, mode: 'down' as RoundMode, name: 'Even + Down' },
    { even: 'even' as RoundEven, mode: 'round' as RoundMode, name: 'Even + Round' }
  ];
  
  roundingConfigs.forEach(config => {
    const rounded = applyASCRounding(testValue, config);
    const isEven = rounded % 2 === 0;
    console.log(`  ${config.name}: ${testValue} → ${rounded} ${isEven ? '(Even ✓)' : '(Odd)'}`);
  });
  
  console.log(`\nWhy this matters for scaling:`);
  console.log(`- Even numbers divide cleanly by 2, 4, 8 etc.`);
  console.log(`- Prevents artifacts when scaling/cropping`);
  console.log(`- Ensures consistent behavior across platforms`);
  console.log(`- Critical for anamorphic desqueeze operations`);
  
  return {
    testsPassed: allTestsPassed,
    testResults: testCases.map(testCase => {
      const result = calculateExactFrameDimensions(
        testCase.sensorWidth,
        testCase.sensorHeight,
        testCase.aspectRatio.width,
        testCase.aspectRatio.height,
        DEFAULT_ROUNDING
      );
      return {
        testCase: testCase.name,
        calculated: result,
        aspectRatio: calculatePreciseAspectRatio(result.width, result.height)
      };
    }),
    roundingDemo: {
      testValue,
      results: roundingConfigs.map(config => ({
        config: config.name,
        result: applyASCRounding(testValue, config),
        isEven: applyASCRounding(testValue, config) % 2 === 0
      }))
    }
  };
}

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testFDLCalculations = testCalculations;
} 