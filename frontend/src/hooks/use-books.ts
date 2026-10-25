import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { bookService } from "@/services/book.service";

export const useBooks = () => useQuery({ queryKey: queryKeys.books, queryFn: bookService.list });

export const useBook = (bookId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.book(bookId ?? ""),
    queryFn: () => bookService.get(bookId!),
    enabled: Boolean(bookId),
  });
