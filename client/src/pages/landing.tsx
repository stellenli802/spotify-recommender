import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiSpotify } from "react-icons/si";
import {
  Sparkles, ListMusic, ArrowRight, Music2,
  TrendingUp, Target, Shuffle, Eye
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" data-testid="text-app-name">Playlist Recommender</span>
          </div>
          <a href="/api/auth/login" target="_top" data-testid="link-login-header">
            <Button variant="outline" size="sm">
              <SiSpotify className="w-4 h-4" />
              Sign in
            </Button>
          </a>
        </div>
      </header>

      <main>
        <section className="py-20 sm:py-28 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-6">
              <Target className="w-3 h-3" />
              Playlist-focused recommendations
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight" data-testid="text-hero-title">
              Spotify Recommends for You.<br />
              <span className="text-primary">We Recommend for Your Playlist.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Spotify blends your entire listening history into one generic mix.
              We analyze the specific playlist you choose and find songs that
              actually fit <em>that</em> vibe -- with a clear reason for every suggestion.
            </p>
            <a href="/api/auth/login" target="_top" data-testid="link-login-hero">
              <Button size="lg" className="gap-2 text-base px-6">
                <SiSpotify className="w-5 h-5" />
                Connect with Spotify
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <p className="text-xs text-muted-foreground mt-3">
              Only requests access to your playlists. No listening data collected.
            </p>
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-3" data-testid="text-why-heading">
              What Spotify Can't Do
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-8 max-w-lg mx-auto">
              Spotify's algorithm is powerful, but it treats all your listening as one signal. Here's what you get when recommendations are playlist-aware.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ComparisonCard
                icon={Target}
                title="Playlist-Specific"
                ours="Analyzes the exact playlist you pick -- gym, study, road trip -- and recommends songs that fit that specific mood."
                theirs="Blends all your playlists, liked songs, and listening history into a single recommendation pool."
              />
              <ComparisonCard
                icon={Eye}
                title="Transparent Reasoning"
                ours="Every suggestion comes with a reason: why this song fits your playlist's style, energy, or recent direction."
                theirs="No explanation. Songs appear in your Discover Weekly with no context for why."
              />
              <ComparisonCard
                icon={TrendingUp}
                title="Two Discovery Modes"
                ours="'Recent Additions' mode follows your evolving taste. 'Overall Style' mode finds songs that match the full playlist."
                theirs="One-size-fits-all algorithm that adapts slowly to changes in your taste."
              />
              <ComparisonCard
                icon={Shuffle}
                title="You're in Control"
                ours="You choose which playlist, which mode, and when. Save results as a new playlist or try again."
                theirs="Refreshes automatically once a week. No way to steer or regenerate."
              />
            </div>
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" data-testid="text-how-heading">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  icon: SiSpotify,
                  title: "Connect",
                  desc: "Sign in with Spotify. We only ask for playlist access.",
                },
                {
                  step: "2",
                  icon: ListMusic,
                  title: "Pick a Playlist",
                  desc: "Choose any playlist and select Recent Additions or Overall Style mode.",
                },
                {
                  step: "3",
                  icon: Sparkles,
                  title: "Discover & Save",
                  desc: "Preview recommendations with reasons, then save as a new Spotify playlist.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="py-10 px-6">
                <Music2 className="w-8 h-8 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2" data-testid="text-cta-heading">
                  Ready to find songs your playlist is missing?
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your Spotify, pick any playlist, and get AI-powered
                  recommendations in seconds. Every suggestion comes with a reason.
                </p>
                <a href="/api/auth/login" target="_top" data-testid="link-login-cta">
                  <Button size="lg" className="gap-2">
                    <SiSpotify className="w-5 h-5" />
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
          <span>Playlist Recommender</span>
          <span>Not affiliated with Spotify AB</span>
        </div>
      </footer>
    </div>
  );
}

function ComparisonCard({
  icon: Icon,
  title,
  ours,
  theirs,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  ours: string;
  theirs: string;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-comparison-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-accent-foreground" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <p className="leading-relaxed">{ours}</p>
          </div>
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Shuffle className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground leading-relaxed">{theirs}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
