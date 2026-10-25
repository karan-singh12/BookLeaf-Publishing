import { api } from "@/lib/api-client";
import type { Book } from "@/types/domain";

export const bookService = {
  async list() {
    return (await api.get<Book[]>("/books")).data;
  },

  async get(bookId: string) {
    return (await api.get<Book>(`/books/${bookId}`)).data;
  },
};
