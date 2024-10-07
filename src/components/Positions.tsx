import React from 'react';
import { client } from '../../utils';
import { SigObject } from '../../App';

export const Positions = ({ signature }: { signature?: SigObject }) => {
  async function watchAllPositions() {
    if (!signature) {
      return console.error('No signature found');
    }

    const result = await client.api.notifications.derivatives.positions.update
      .$post({
        json: signature,
      })
      .then((r) => r.json());
    console.log('🪵 | watchAllPositions | result:', result);
  }

  return (
    <button onClick={watchAllPositions} disabled={!signature}>
      positions
    </button>
  );
};
