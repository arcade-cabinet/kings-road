import { trait } from 'koota';

export const RoadPosition = trait({ distance: 0 });
export const IsOnRoad = trait();
export const IsAnchor = trait({ anchorId: '' });
export const IsFeature = trait({ featureId: '', tier: '' as string });
