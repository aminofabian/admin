import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameApiSettingsApi } from '@/lib/api';
import { GAME_API_VERSIONS } from '@/lib/constants/game-api-version';
import { useCategory2GameApi } from '../use-category2-game-api';

const addToast = vi.fn();

vi.mock('@/lib/api', () => ({
  gameApiSettingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast }),
}));

const apiMock = vi.mocked(gameApiSettingsApi);

async function renderLoaded(useV2: boolean) {
  apiMock.get.mockResolvedValue({ category2_v2_api: useV2 });
  const hook = renderHook(() => useCategory2GameApi());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('useCategory2GameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the active version', async () => {
    const { result } = await renderLoaded(true);
    expect(result.current.activeVersion).toBe(GAME_API_VERSIONS.V2);
  });

  it('exposes a load error', async () => {
    apiMock.get.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCategory2GameApi());
    await waitFor(() => expect(result.current.error).toBe('boom'));
  });

  it('ignores requests for the version already active', async () => {
    const { result } = await renderLoaded(false);
    act(() => result.current.requestVersion(GAME_API_VERSIONS.V1));
    expect(result.current.pendingVersion).toBeNull();
  });

  it('switches version only after confirmation', async () => {
    const { result } = await renderLoaded(false);
    apiMock.update.mockResolvedValue({ category2_v2_api: true });

    act(() => result.current.requestVersion(GAME_API_VERSIONS.V2));
    expect(result.current.pendingVersion).toBe(GAME_API_VERSIONS.V2);
    expect(apiMock.update).not.toHaveBeenCalled();

    await act(() => result.current.confirmRequest());
    expect(apiMock.update).toHaveBeenCalledWith({ category2_v2_api: true });
    expect(result.current.activeVersion).toBe(GAME_API_VERSIONS.V2);
    expect(result.current.pendingVersion).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('keeps the previous version when the update fails', async () => {
    const { result } = await renderLoaded(true);
    apiMock.update.mockRejectedValue(new Error('nope'));

    act(() => result.current.requestVersion(GAME_API_VERSIONS.V1));
    await act(() => result.current.confirmRequest());

    expect(result.current.activeVersion).toBe(GAME_API_VERSIONS.V2);
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', description: 'nope' }));
  });

  it('cancels a pending request', async () => {
    const { result } = await renderLoaded(true);
    act(() => result.current.requestVersion(GAME_API_VERSIONS.V1));
    act(() => result.current.cancelRequest());
    expect(result.current.pendingVersion).toBeNull();
  });
});
