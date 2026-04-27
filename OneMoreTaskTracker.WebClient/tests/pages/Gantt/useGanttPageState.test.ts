import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGanttPageState, ZOOM_STORAGE_KEY } from '../../../src/pages/Gantt/useGanttPageState';

beforeEach(() => {
  localStorage.clear();
});

describe('useGanttPageState', () => {
  it('defaults scope to "all" for Managers', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.scope).toBe('all');
  });

  it('defaults scope to "mine" for developers and QA', () => {
    const { result: fe } = renderHook(() => useGanttPageState('FrontendDeveloper'));
    expect(fe.current.scope).toBe('mine');
    const { result: be } = renderHook(() => useGanttPageState('BackendDeveloper'));
    expect(be.current.scope).toBe('mine');
    const { result: qa } = renderHook(() => useGanttPageState('Qa'));
    expect(qa.current.scope).toBe('mine');
  });

  it('defaults zoom to twoWeeks when nothing persisted', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.zoom).toBe('twoWeeks');
  });

  it('persists zoom to localStorage when changed', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    act(() => {
      result.current.setZoom('month');
    });
    expect(result.current.zoom).toBe('month');
    expect(localStorage.getItem(ZOOM_STORAGE_KEY)).toBe('"month"');
  });

  it('reads persisted zoom on remount', () => {
    localStorage.setItem(ZOOM_STORAGE_KEY, '"week"');
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.zoom).toBe('week');
  });

  it('falls back to default when persisted zoom is corrupted', () => {
    localStorage.setItem(ZOOM_STORAGE_KEY, '{not-json');
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.zoom).toBe('twoWeeks');
  });

  it('falls back to default when persisted zoom is not a valid ZoomLevel', () => {
    localStorage.setItem(ZOOM_STORAGE_KEY, '"yearly"');
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.zoom).toBe('twoWeeks');
  });

  it('revealTasks switches the revealed id and only allows one at a time', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    act(() => {
      result.current.revealTasks(7);
    });
    expect(result.current.revealedFeatureId).toBe(7);
    act(() => {
      result.current.revealTasks(8);
    });
    expect(result.current.revealedFeatureId).toBe(8);
    act(() => {
      result.current.revealTasks(null);
    });
    expect(result.current.revealedFeatureId).toBeNull();
  });

  it('toggleFeatureExpanded flips expansion state per feature id', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    expect(result.current.expandedFeatureIds.has(42)).toBe(false);
    act(() => {
      result.current.toggleFeatureExpanded(42);
    });
    expect(result.current.expandedFeatureIds.has(42)).toBe(true);
    act(() => {
      result.current.toggleFeatureExpanded(42);
    });
    expect(result.current.expandedFeatureIds.has(42)).toBe(false);
  });

  it('supports simultaneous expansion of multiple features', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    act(() => {
      result.current.toggleFeatureExpanded(1);
      result.current.toggleFeatureExpanded(2);
      result.current.toggleFeatureExpanded(3);
    });
    expect(result.current.expandedFeatureIds.size).toBe(3);
    expect(result.current.expandedFeatureIds.has(1)).toBe(true);
    expect(result.current.expandedFeatureIds.has(2)).toBe(true);
    expect(result.current.expandedFeatureIds.has(3)).toBe(true);
  });

  it('today stays stable across re-renders (snapshot on mount)', () => {
    const { result, rerender } = renderHook(() => useGanttPageState('Manager'));
    const initial = result.current.today;
    rerender();
    expect(result.current.today).toBe(initial);
    expect(initial).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('exposes setScope and setStateFilter that update state', () => {
    const { result } = renderHook(() => useGanttPageState('Manager'));
    act(() => {
      result.current.setScope('mine');
    });
    expect(result.current.scope).toBe('mine');
    act(() => {
      result.current.setStateFilter('Development');
    });
    expect(result.current.stateFilter).toBe('Development');
  });
});
