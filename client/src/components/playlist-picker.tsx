import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, Music2, Check } from "lucide-react";
import { useState } from "react";

interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
}

interface PlaylistPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export default function PlaylistPicker({ open, onClose, onSelect }: PlaylistPickerProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: playlists, isLoading } = useQuery<SpotifyPlaylist[]>({
    queryKey: ["/api/playlists"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: open,
  });

  const selectMutation = useMutation({
    mutationFn: async (playlist: SpotifyPlaylist) => {
      const res = await apiRequest("POST", "/api/source-playlist", {
        spotifyPlaylistId: playlist.id,
        name: playlist.name,
        imageUrl: playlist.imageUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Playlist selected!", description: "You can now generate recommendations from this playlist." });
      onSelect();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to select playlist", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (playlists || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a Playlist</DialogTitle>
          <DialogDescription>
            Select a playlist to get AI-powered song recommendations from.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-playlists"
          />
        </div>

        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-32 h-4" />
                    <Skeleton className="w-20 h-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {search ? "No playlists match your search" : "No playlists found"}
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {filtered.map((playlist) => (
                <button
                  key={playlist.id}
                  className="w-full flex items-center gap-3 p-2 rounded-md text-left hover-elevate"
                  onClick={() => selectMutation.mutate(playlist)}
                  disabled={selectMutation.isPending}
                  data-testid={`button-playlist-${playlist.id}`}
                >
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Music2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{playlist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {playlist.trackCount} track{playlist.trackCount !== 1 ? "s" : ""} · {playlist.owner}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
