import { useMemo } from 'react';
import type { FeatureSummary } from '../../common/types/feature';
import type { DateWindow } from './ganttMath';
import {
  computeFeatureGeometry,
  type FeatureBarGeometry,
} from './ganttStageGeometry';

export interface UseFeatureTaxonomyArgs {
  feature: FeatureSummary;
  loadedRange: DateWindow;
  today: string;
  dayPx: number;
}

export function useFeatureTaxonomy(args: UseFeatureTaxonomyArgs): FeatureBarGeometry {
  const { feature, loadedRange, today, dayPx } = args;
  return useMemo(
    () => computeFeatureGeometry(loadedRange, feature, today, dayPx),
    [feature, loadedRange, today, dayPx],
  );
}
