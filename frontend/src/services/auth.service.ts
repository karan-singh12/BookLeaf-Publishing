import { api } from "@/lib/api-client";
import type { User } from "@/types/domain";

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>("/auth/login", { email, password }, { public: true });
    return data;
  },

  async me() {
    return (await api.get<User>("/auth/me")).data;
  },

  async onboardAuthor(data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    city?: string;
    authorCode?: string;
  }) {
    return (await api.post<User>("/auth/authors", data)).data;
  },
};
