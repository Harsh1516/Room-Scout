import React from 'react';
import { MatrixInteractiveGridBackground } from './MatrixInteractiveGridBackground';

/**
 * CrystalLotusBloomBackground
 * Forwarding to MatrixInteractiveGridBackground:
 * - Crystal lotus image completely removed
 * - Pitch black background (#000000)
 * - Cybernetic thin matrix lines that form dynamic concentric circles where the mouse pointer slides
 */
export function CrystalLotusBloomBackground(props) {
  return <MatrixInteractiveGridBackground {...props} />;
}

export default CrystalLotusBloomBackground;
