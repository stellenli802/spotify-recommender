import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/lib/theme-provider";
import {
  Sparkles, LogOut, ListMusic, Clock, Play,
  Moon, Sun, Music2, ChevronRight, Save,
  RefreshCw, TrendingUp, Layers, ExternalLink
} from "lucide-react";
import { SiSpotify } from "react-icons/si";
import PlaylistPicker from "@/components/playlist-picker";
import type { SourcePlaylist, Recommendation, RecommendedTrack } from "@shared/schema";

interface DashboardData {
  sourcePlaylist: SourcePlaylist | null;
  recommendations: (Recommendation & { tracks: RecommendedTrack[] })[];
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data: dashboardData, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  const recommendMutation = useMutation({
    mutationFn: async (mode: "recent" | "overall") => {
      const res = await apiRequest("POST", "/api/recommend", { mode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Recommendations ready!", description: "Scroll down to see your new song suggestions." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || dashLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) return null;

  const sourcePlaylist = dashboardData?.sourcePlaylist;
  const recs = dashboardData?.recommendations || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold" data-testid="text-app-name">Playlist Recommender</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-toggle-theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{user.displayName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:inline" data-testid="text-username">{user.displayName}</span>
            </div>
            <a href="/api/auth/logout" data-testid="link-logout">
              <Button variant="ghost" size="icon">
                <LogOut className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {sourcePlaylist?.imageUrl ? (
                  <img
                    src={sourcePlaylist.imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center shrink-0">
                    <ListMusic className="w-5 h-5 text-accent-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  {sourcePlaylist ? (
                    <>
                      <p className="font-semibold truncate" data-testid="text-source-playlist-name">{sourcePlaylist.name}</p>
                      <p className="text-xs text-muted-foreground">Source playlist for recommendations</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">No playlist selected</p>
                      <p className="text-xs text-muted-foreground">Choose a playlist to get started</p>
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPicker(true)} data-testid="button-change-playlist">
                <ListMusic className="w-4 h-4" />
                {sourcePlaylist ? "Change" : "Pick a Playlist"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {sourcePlaylist && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card
              className="hover-elevate cursor-pointer"
              onClick={() => !recommendMutation.isPending && recommendMutation.mutate("recent")}
              data-testid="card-recommend-recent"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center shrink-0">
                    {recommendMutation.isPending && recommendMutation.variables === "recent" ? (
                      <RefreshCw className="w-5 h-5 text-accent-foreground animate-spin" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-accent-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Based on Recent Additions</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Analyzes your most recently added tracks and suggests songs that match your current listening trend
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="hover-elevate cursor-pointer"
              onClick={() => !recommendMutation.isPending && recommendMutation.mutate("overall")}
              data-testid="card-recommend-overall"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center shrink-0">
                    {recommendMutation.isPending && recommendMutation.variables === "overall" ? (
                      <RefreshCw className="w-5 h-5 text-accent-foreground animate-spin" />
                    ) : (
                      <Layers className="w-5 h-5 text-accent-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Based on Overall Style</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Samples tracks from your entire playlist and suggests songs that match the overall mood and genre
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {recommendMutation.isPending && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="font-medium">Generating recommendations...</p>
              <p className="text-sm text-muted-foreground">AI is analyzing your playlist and finding the perfect songs</p>
            </CardContent>
          </Card>
        )}

        {recs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" data-testid="text-recommendations-title">
              Your Recommendations
            </h2>
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}

        {!sourcePlaylist && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Get Started</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Pick a playlist from your Spotify library and we'll use AI to suggest songs you'll love
              </p>
              <Button onClick={() => setShowPicker(true)} data-testid="button-get-started">
                <ListMusic className="w-4 h-4" />
                Choose a Playlist
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {showPicker && (
        <PlaylistPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={() => {
            setShowPicker(false);
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          }}
        />
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation & { tracks: RecommendedTrack[] } }) {
  const [expanded, setExpanded] = useState(true);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/recommend/${rec.id}/save`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Saved to Spotify!", description: "Your recommendation playlist has been created." });
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const date = new Date(rec.createdAt);
  const foundCount = rec.tracks.filter(t => t.spotifyTrackId).length;

  return (
    <Card data-testid={`card-recommendation-${rec.id}`}>
      <div
        className="flex items-center justify-between gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            {rec.mode === "recent" ? (
              <TrendingUp className="w-4 h-4 text-primary" />
            ) : (
              <Layers className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`text-rec-label-${rec.id}`}>
              {rec.mode === "recent" ? "Recent Additions" : "Overall Style"}
            </p>
            <p className="text-xs text-muted-foreground">
              {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {" at "}
              {date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              {" \u00B7 "}
              {foundCount} track{foundCount !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rec.savedPlaylistUrl ? (
            <a
              href={rec.savedPlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-open-saved-${rec.id}`}
            >
              <Button variant="ghost" size="icon">
                <SiSpotify className="w-4 h-4 text-primary" />
              </Button>
            </a>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || foundCount === 0}
              data-testid={`button-save-${rec.id}`}
            >
              {saveMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save to Spotify
            </Button>
          )}
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </div>
      {expanded && rec.tracks.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {rec.tracks.map((track) => (
            <TrackRow key={track.id} track={track} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TrackRow({ track }: { track: RecommendedTrack }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const canPlay = !!track.spotifyTrackId;

  return (
    <div data-testid={`row-track-${track.id}`}>
      <div className="flex items-center gap-3 py-2 px-2 rounded-md text-sm">
        {track.albumImageUrl ? (
          <img
            src={track.albumImageUrl}
            alt=""
            className="w-10 h-10 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Music2 className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{track.trackName}</p>
          <p className="truncate text-xs text-muted-foreground">{track.artistName}</p>
        </div>
        {track.reason && (
          <p className="text-xs text-muted-foreground hidden lg:block max-w-[200px] truncate" title={track.reason}>
            {track.reason}
          </p>
        )}
        {track.durationMs && (
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums hidden sm:inline">
            {Math.floor(track.durationMs / 60000)}:{String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, "0")}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {canPlay && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmbed(!showEmbed)}
              data-testid={`button-play-${track.id}`}
              className="toggle-elevate"
            >
              {showEmbed ? (
                <ChevronRight className="w-4 h-4 rotate-90" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
          {track.spotifyUrl ? (
            <a
              href={track.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-spotify-${track.id}`}
            >
              <Button variant="ghost" size="icon">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          ) : !track.spotifyTrackId ? (
            <Badge variant="secondary" className="text-xs shrink-0">Not found</Badge>
          ) : null}
        </div>
      </div>
      {showEmbed && track.spotifyTrackId && (
        <div className="px-2 pb-2">
          <iframe
            src={`https://open.spotify.com/embed/track/${track.spotifyTrackId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-md"
            data-testid={`embed-player-${track.id}`}
          />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-md" />
            <Skeleton className="w-32 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-20 h-4" />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="w-40 h-5" />
              <Skeleton className="w-56 h-3" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 flex gap-4">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="w-40 h-5" />
                  <Skeleton className="w-full h-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
