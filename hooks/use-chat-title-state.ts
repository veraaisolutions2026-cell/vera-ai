import { create } from "zustand"

type ChatTitleState = {
  titles: Record<string, string>
  loading: Record<string, boolean>
  setTitle: (chatId: string, title: string) => void
  setLoading: (chatId: string, isLoading: boolean) => void
  clearTitle: (chatId: string) => void
}

export const useChatTitleState = create<ChatTitleState>((set) => ({
  titles: {},
  loading: {},
  setTitle: (chatId, title) =>
    set((state) => ({
      titles: {
        ...state.titles,
        [chatId]: title,
      },
    })),
  setLoading: (chatId, isLoading) =>
    set((state) => ({
      loading: {
        ...state.loading,
        [chatId]: isLoading,
      },
    })),
  clearTitle: (chatId) =>
    set((state) => {
      const nextTitles = { ...state.titles }
      const nextLoading = { ...state.loading }
      delete nextTitles[chatId]
      delete nextLoading[chatId]

      return {
        titles: nextTitles,
        loading: nextLoading,
      }
    }),
}))
