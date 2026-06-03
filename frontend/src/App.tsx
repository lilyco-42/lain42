import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import PostDetailPage from "@/pages/PostDetailPage";
import PublishPage from "@/pages/PublishPage";
import UserProfilePage from "@/pages/UserProfilePage";
import SearchPage from "@/pages/SearchPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      fetchMe();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  }, [fetchMe]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:slug" element={<HomePage />} />
      <Route path="/tag/:tag" element={<HomePage />} />
      <Route path="/post/:id" element={<PostDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/callback" element={<LoginPage />} />
      <Route path="/publish" element={<PublishPage />} />
      <Route path="/edit/:id" element={<PublishPage />} />
      <Route path="/user/:username" element={<UserProfilePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
