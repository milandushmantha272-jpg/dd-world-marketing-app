import React from 'react';
import { RealDialPadPage } from './RealDialPadPage';

/**
 * The first screen after agent login is intentionally dedicated to the
 * real Android dial pad. Other company pages remain available through the
 * bottom navigation and More menu.
 */
export const HomePage: React.FC = () => {
  return <RealDialPadPage />;
};
