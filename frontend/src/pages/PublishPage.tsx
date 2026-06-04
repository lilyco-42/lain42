import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Trash2, Upload } from "lucide-react";
import Editor from "@monaco-editor/react";
import { CATEGORIES } from "@/types";
import type { PostDetail, ImageItem } from "@/types";

export default function PublishPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [configFiles, setConfigFiles] = useState<
    { path: string; content: string; language: string }[]
  >([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: existingPost } = useQuery({
    queryKey: ["post", id],
    queryFn: () => api.get<PostDetail>(`/posts/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setDescription(existingPost.description);
      setContent(existingPost.content);
      setCategory(existingPost.category);
      setTags(existingPost.tags);
      setConfigFiles(existingPost.config_files);
      setImages(existingPost.images);
    }
  }, [existingPost]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await api.post<ImageItem>("/upload/image", formData);
      setImages((prev) => [...prev, result]);
    }
    setUploading(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput("");
  };

  const addConfigFile = () => {
    setConfigFiles([...configFiles, { path: "", content: "", language: "plaintext" }]);
  };

  const removeConfigFile = (idx: number) => {
    setConfigFiles(configFiles.filter((_, i) => i !== idx));
  };

  const publishMutation = useMutation({
    mutationFn: (data: unknown) =>
      isEdit ? api.put(`/posts/${id}`, data) : api.post("/posts", data),
    onSuccess: (result: any) => {
      window.location.href = `/post/${result.id}`;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishMutation.mutate({
      title,
      description,
      content,
      category,
      tags,
      config_files: configFiles,
      image_ids: images.map((img) => img.id),
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{isEdit ? "编辑" : "发布"}配置</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <Label>简短描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>分类</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="输入标签后回车"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} className="gap-1">
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>截图/图片 (最多5张)</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mt-2">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url_300}
                    alt=""
                    loading="lazy"
                    className="rounded-lg object-cover w-full aspect-square transition-all duration-700"
                    style={{ filter: "blur(10px)" }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.filter = "blur(0)"; }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={async () => {
                      try { await api.delete(`/upload/image/${img.id}`); } catch {}
                      setImages(images.filter((_, i) => i !== idx));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {/* Uploading placeholder tile */}
              {uploading && images.length < 5 && (
                <div className="relative rounded-lg aspect-square bg-secondary/50 flex items-center justify-center overflow-hidden">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-muted-foreground">上传中...</span>
                  </div>
                </div>
              )}
              {/* Upload button */}
              {!uploading && images.length < 5 && (
                <label className="border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-secondary/30 transition-all duration-200">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">上传图片</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>配置文件</Label>
              <Button type="button" variant="outline" size="sm" onClick={addConfigFile}>
                <Plus className="h-4 w-4 mr-1" /> 添加文件
              </Button>
            </div>
            {configFiles.map((file, idx) => (
              <Card key={idx} className="mb-3">
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="文件路径，如 ~/.config/hypr/hyprland.conf"
                      value={file.path}
                      onChange={(e) => {
                        const updated = [...configFiles];
                        updated[idx] = { ...updated[idx], path: e.target.value };
                        setConfigFiles(updated);
                      }}
                      className="flex-1"
                    />
                    <Select
                      value={file.language}
                      onValueChange={(v) => {
                        if (!v) return;
                        const updated = [...configFiles];
                        updated[idx] = { ...updated[idx], language: v };
                        setConfigFiles(updated);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plaintext">Plain</SelectItem>
                        <SelectItem value="ini">INI</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="yaml">YAML</SelectItem>
                        <SelectItem value="toml">TOML</SelectItem>
                        <SelectItem value="bash">Bash</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="lua">Lua</SelectItem>
                        <SelectItem value="xml">XML</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeConfigFile(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Editor
                    height="200px"
                    language={file.language || "plaintext"}
                    value={file.content}
                    onChange={(v) => {
                      const updated = [...configFiles];
                      updated[idx] = { ...updated[idx], content: v || "" };
                      setConfigFiles(updated);
                    }}
                    theme="vs-dark"
                    options={{ minimap: { enabled: false }, fontSize: 13 }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Label>教程正文 (Markdown)</Label>
            <Editor
              height="400px"
              language="markdown"
              value={content}
              onChange={(v) => setContent(v || "")}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "发布中..." : isEdit ? "保存修改" : "发布配置"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
