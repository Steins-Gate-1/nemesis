import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import {
  useDeepfakeScans, useDeepfakeScan, useDeepfakeStats,
  useDeepfakeExposureProfiles, useCreateExposureProfile, useMitigationGuidance
} from "@/hooks/use-deepfake";
import { useState } from "react";
import { format } from "date-fns";
import {
  Fingerprint, ScanLine, Play, AlertCircle, CheckCircle, Shield,
  Video, Mic, Image, Activity, ChevronDown, ChevronUp,
  UserCheck, BarChart3, Clock, ShieldAlert
} from "lucide-react";

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
    NOMINAL: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase font-mono border rounded-sm ${colors[level?.toUpperCase()] || colors.NOMINAL}`}>
      {level}
    </span>
  );
}

function MediaTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "video": return <Video className="w-4 h-4 text-primary" />;
    case "audio": return <Mic className="w-4 h-4 text-cyan-400" />;
    case "image": return <Image className="w-4 h-4 text-purple-400" />;
    default: return <ScanLine className="w-4 h-4 text-primary" />;
  }
}

export default function Deepfake() {
  const [activeTab, setActiveTab] = useState<"scanner" | "exposure" | "history" | "mitigation">("scanner");
  const { data: scans, isLoading: scansLoading } = useDeepfakeScans();
  const { data: stats } = useDeepfakeStats();
  const { data: profiles, isLoading: profilesLoading } = useDeepfakeExposureProfiles();

  const scanMutation = useDeepfakeScan();
  const createProfile = useCreateExposureProfile();
  const mitigationMutation = useMitigationGuidance();

  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "audio" | "image">("video");
  const [subjectName, setSubjectName] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);

  const [profileName, setProfileName] = useState("");
  const [videoMinutes, setVideoMinutes] = useState(0);
  const [audioScore, setAudioScore] = useState(0);
  const [faceVisibility, setFaceVisibility] = useState(0);
  const [imageAvailability, setImageAvailability] = useState(0);

  const [exposureLevel, setExposureLevel] = useState("LOW");
  const [syntheticDetected, setSyntheticDetected] = useState(false);
  const [guidance, setGuidance] = useState<string[]>([]);

  const [expandedScan, setExpandedScan] = useState<number | null>(null);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) return;
    scanMutation.mutate(
      { mediaUrl, mediaType, subjectName: subjectName || undefined },
      {
        onSuccess: (data) => {
          setScanResult(data);
          setMediaUrl("");
          setSubjectName("");
        },
      }
    );
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) return;
    createProfile.mutate(
      {
        subjectName: profileName,
        videoMinutes,
        audioScore,
        faceVisibilityScore: faceVisibility,
        imageAvailabilityScore: imageAvailability,
      },
      {
        onSuccess: () => {
          setProfileName("");
          setVideoMinutes(0);
          setAudioScore(0);
          setFaceVisibility(0);
          setImageAvailability(0);
        },
      }
    );
  };

  const handleGenerateMitigation = () => {
    mitigationMutation.mutate(
      { exposureLevel, syntheticDetected },
      {
        onSuccess: (data) => setGuidance(data.guidance || []),
      }
    );
  };

  const tabs = [
    { id: "scanner", label: "Media Scanner", icon: ScanLine },
    { id: "exposure", label: "Exposure Profiles", icon: UserCheck },
    { id: "history", label: "Scan History", icon: Clock },
    { id: "mitigation", label: "Mitigation", icon: ShieldAlert },
  ] as const;

  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "text-red-400";
      case "HIGH": return "text-orange-400";
      case "MODERATE": case "MEDIUM": return "text-yellow-400";
      default: return "text-green-400";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold flex items-center gap-3">
              <Fingerprint className="w-8 h-8 text-primary" />
              Deepfake Warfare Defense
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              SYNTHETIC MEDIA DETECTION & EXPOSURE ANALYSIS
            </p>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">TOTAL SCANS</p>
            <p data-testid="text-total-scans" className="text-3xl font-mono text-foreground">{stats?.totalScans || 0}</p>
          </TacticalCard>
          <TacticalCard variant={(stats?.threatsDetected || 0) > 0 ? "danger" : "default"} className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">THREATS DETECTED</p>
            <p data-testid="text-threats-detected" className={`text-3xl font-mono ${(stats?.threatsDetected || 0) > 0 ? "text-red-400 animate-pulse" : "text-foreground"}`}>
              {stats?.threatsDetected || 0}
            </p>
          </TacticalCard>
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">AVG CONFIDENCE</p>
            <p data-testid="text-avg-confidence" className="text-3xl font-mono text-primary">{stats?.avgConfidence || 0}%</p>
          </TacticalCard>
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">EXPOSURE PROFILES</p>
            <p data-testid="text-exposure-profiles" className="text-3xl font-mono text-foreground">{stats?.exposureProfiles || 0}</p>
          </TacticalCard>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-primary/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider rounded-t-sm border-b-2 transition-all ${
                activeTab === tab.id ? "bg-primary/10 text-primary border-primary" : "text-muted-foreground hover:bg-white/5 border-transparent"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "scanner" && (
          <div className="space-y-6">
            <TacticalCard className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-primary" />
                SUBMIT MEDIA FOR ANALYSIS
              </h3>
              <form onSubmit={handleScan} className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-primary/70 mb-2 block">MEDIA URL</label>
                  <input
                    data-testid="input-media-url"
                    type="url"
                    required
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/media.mp4"
                    className="w-full bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-primary/70 mb-3 block">MEDIA TYPE</label>
                  <div className="flex gap-3">
                    {([
                      { id: "video", label: "VIDEO", icon: Video },
                      { id: "audio", label: "AUDIO", icon: Mic },
                      { id: "image", label: "IMAGE", icon: Image },
                    ] as const).map(t => (
                      <button
                        key={t.id}
                        type="button"
                        data-testid={`select-media-type-${t.id}`}
                        onClick={() => setMediaType(t.id)}
                        className={`flex-1 p-3 rounded-sm border text-center transition-all ${
                          mediaType === t.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-black/30 border-primary/10 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <t.icon className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-xs font-mono">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-primary/70 mb-2 block">SUBJECT NAME (OPTIONAL)</label>
                  <input
                    data-testid="input-subject-name"
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <button
                  data-testid="button-analyze"
                  type="submit"
                  disabled={scanMutation.isPending}
                  className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-3 font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      ANALYZING...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      ANALYZE MEDIA
                    </>
                  )}
                </button>
              </form>
            </TacticalCard>

            {scanMutation.isPending && (
              <TacticalCard className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-2 border-primary/30 rounded-full animate-ping" />
                    <div className="absolute inset-2 border-2 border-primary/50 rounded-full animate-pulse" />
                    <div className="absolute inset-4 border-2 border-primary rounded-full animate-spin" />
                    <ScanLine className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-mono text-primary animate-pulse">RUNNING DEEPFAKE ANALYSIS PIPELINE...</p>
                  <div className="w-full max-w-md bg-black/50 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-[scan_3s_ease-in-out_infinite] w-1/3" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                  </div>
                </div>
              </TacticalCard>
            )}

            {scanResult && !scanMutation.isPending && (
              <TacticalCard
                variant={scanResult.riskLevel === "CRITICAL" ? "danger" : scanResult.riskLevel === "HIGH" ? "warning" : "default"}
                className="p-6"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  {scanResult.isDeepfake ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  ANALYSIS RESULT
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">SYNTHETIC PROBABILITY</p>
                    <p className={`text-4xl font-mono font-bold ${(scanResult.syntheticProbability || 0) > 70 ? "text-red-400" : (scanResult.syntheticProbability || 0) > 40 ? "text-yellow-400" : "text-green-400"}`}>
                      {scanResult.syntheticProbability || 0}%
                    </p>
                    <div className="w-full bg-black h-2 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-1000 ${(scanResult.syntheticProbability || 0) > 70 ? "bg-red-500" : (scanResult.syntheticProbability || 0) > 40 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${scanResult.syntheticProbability || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">CONFIDENCE SCORE</p>
                    <p className="text-4xl font-mono font-bold text-primary">
                      {scanResult.confidenceScore || 0}%
                    </p>
                    <div className="w-full bg-black h-2 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${scanResult.confidenceScore || 0}%` }} />
                    </div>
                  </div>

                  <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">RISK LEVEL</p>
                    <SeverityBadge level={scanResult.riskLevel || "LOW"} />
                  </div>
                </div>

                {scanResult.detectionTags && Array.isArray(scanResult.detectionTags) && scanResult.detectionTags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">DETECTION TAGS</p>
                    <div className="flex flex-wrap gap-2">
                      {scanResult.detectionTags.map((tag: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary border border-primary/30 rounded-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scanResult.analysisSummary && (
                  <div className="bg-black/30 border border-primary/10 rounded-sm p-4">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">ANALYSIS SUMMARY</p>
                    <p className="text-sm font-mono text-foreground/80">{scanResult.analysisSummary}</p>
                  </div>
                )}
              </TacticalCard>
            )}
          </div>
        )}

        {activeTab === "exposure" && (
          <div className="space-y-6">
            <TacticalCard className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                CREATE EXPOSURE PROFILE
              </h3>
              <p className="text-xs text-muted-foreground font-mono mb-6">
                Assess deepfake vulnerability based on publicly available media of a subject.
              </p>

              <form onSubmit={handleCreateProfile} className="space-y-5">
                <div>
                  <label className="text-xs font-mono text-primary/70 mb-2 block">SUBJECT NAME</label>
                  <input
                    data-testid="input-profile-subject-name"
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-primary/70 mb-2 block">
                      VIDEO MINUTES AVAILABLE <span className="text-foreground/50">({videoMinutes})</span>
                    </label>
                    <input
                      data-testid="input-video-minutes"
                      type="range"
                      min={0}
                      max={200}
                      value={videoMinutes}
                      onChange={(e) => setVideoMinutes(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                      <span>0</span>
                      <span>200 min</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-primary/70 mb-2 block">
                      AUDIO SCORE <span className="text-foreground/50">({audioScore})</span>
                    </label>
                    <input
                      data-testid="input-audio-score"
                      type="range"
                      min={0}
                      max={100}
                      value={audioScore}
                      onChange={(e) => setAudioScore(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-primary/70 mb-2 block">
                      FACE VISIBILITY <span className="text-foreground/50">({faceVisibility})</span>
                    </label>
                    <input
                      data-testid="input-face-visibility"
                      type="range"
                      min={0}
                      max={100}
                      value={faceVisibility}
                      onChange={(e) => setFaceVisibility(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-primary/70 mb-2 block">
                      IMAGE AVAILABILITY <span className="text-foreground/50">({imageAvailability})</span>
                    </label>
                    <input
                      data-testid="input-image-availability"
                      type="range"
                      min={0}
                      max={100}
                      value={imageAvailability}
                      onChange={(e) => setImageAvailability(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">ESTIMATED EXPOSURE</p>
                  <p className="text-3xl font-mono font-bold text-primary">
                    {Math.round((Math.min(videoMinutes, 200) / 200 * 100 * 0.4) + (audioScore * 0.2) + (faceVisibility * 0.2) + (imageAvailability * 0.2))}%
                  </p>
                </div>

                <button
                  data-testid="button-create-profile"
                  type="submit"
                  disabled={createProfile.isPending}
                  className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-3 font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
                >
                  {createProfile.isPending ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      CREATING...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      CREATE EXPOSURE PROFILE
                    </>
                  )}
                </button>
              </form>
            </TacticalCard>

            <h3 className="text-lg font-bold border-l-4 border-primary pl-3">EXISTING PROFILES</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profilesLoading ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">LOADING PROFILES...</div>
              ) : !profiles?.length ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">NO EXPOSURE PROFILES CREATED</div>
              ) : profiles.map((profile: any) => (
                <TacticalCard
                  key={profile.id}
                  data-testid={`card-profile-${profile.id}`}
                  variant={profile.exposureLevel === "CRITICAL" ? "danger" : profile.exposureLevel === "HIGH" ? "warning" : "default"}
                  className="p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-bold text-foreground">{profile.subjectName}</h4>
                    <SeverityBadge level={profile.exposureLevel || "LOW"} />
                  </div>

                  <div className="text-center my-3">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">EXPOSURE SCORE</p>
                    <p className={`text-3xl font-mono font-bold ${getRiskColor(profile.exposureLevel || "LOW")}`}>
                      {profile.exposureScore || 0}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-black/30 p-2 rounded-sm">
                      <span className="text-muted-foreground">VIDEO:</span>{" "}
                      <span className="text-foreground">{profile.videoMinutes || 0}m</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-sm">
                      <span className="text-muted-foreground">AUDIO:</span>{" "}
                      <span className="text-foreground">{profile.audioScore || 0}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-sm">
                      <span className="text-muted-foreground">FACE:</span>{" "}
                      <span className="text-foreground">{profile.faceVisibilityScore || 0}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-sm">
                      <span className="text-muted-foreground">IMAGES:</span>{" "}
                      <span className="text-foreground">{profile.imageAvailabilityScore || 0}</span>
                    </div>
                  </div>

                  <div className="border-t border-primary/10 pt-3 mt-3">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {profile.createdAt ? format(new Date(profile.createdAt), "yyyy-MM-dd HH:mm") : "N/A"}
                    </span>
                  </div>
                </TacticalCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-l-4 border-primary pl-3">SCAN HISTORY</h3>

            {scansLoading ? (
              <div className="text-center text-primary/50 py-10 font-mono text-sm">LOADING SCAN ARCHIVES...</div>
            ) : !scans?.length ? (
              <div className="text-center text-primary/50 py-10 font-mono text-sm">NO SCANS RECORDED</div>
            ) : scans.map((scan: any) => {
              const isExpanded = expandedScan === scan.id;
              const riskColor = getRiskColor(scan.riskLevel || "LOW");

              return (
                <TacticalCard
                  key={scan.id}
                  data-testid={`card-scan-${scan.id}`}
                  variant={scan.riskLevel === "CRITICAL" ? "danger" : scan.riskLevel === "HIGH" ? "warning" : "default"}
                  className="p-0"
                >
                  <button
                    data-testid={`button-expand-scan-${scan.id}`}
                    onClick={() => setExpandedScan(isExpanded ? null : scan.id)}
                    className="w-full p-4 flex items-center justify-between gap-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MediaTypeIcon type={scan.mediaType || "video"} />
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-foreground truncate">{scan.mediaUrl}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {scan.createdAt ? format(new Date(scan.createdAt), "yyyy-MM-dd HH:mm:ss") : "N/A"}
                          {scan.subjectName && <span className="ml-2 text-primary/70">{scan.subjectName}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {scan.status === "completed" && (
                        <>
                          <span className={`text-lg font-mono font-bold ${riskColor}`}>
                            {scan.syntheticProbability || 0}%
                          </span>
                          <SeverityBadge level={scan.riskLevel || "LOW"} />
                        </>
                      )}
                      {scan.status === "pending" && (
                        <span className="text-[10px] font-mono text-yellow-400 animate-pulse">PENDING</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-primary/10 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-black/30 p-3 rounded-sm">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">SYNTHETIC PROBABILITY</p>
                          <p className={`text-2xl font-mono font-bold ${(scan.syntheticProbability || 0) > 70 ? "text-red-400" : "text-green-400"}`}>
                            {scan.syntheticProbability || 0}%
                          </p>
                        </div>
                        <div className="bg-black/30 p-3 rounded-sm">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">CONFIDENCE</p>
                          <p className="text-2xl font-mono font-bold text-primary">{scan.confidenceScore || 0}%</p>
                        </div>
                        <div className="bg-black/30 p-3 rounded-sm">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">MEDIA TYPE</p>
                          <p className="text-sm font-mono text-foreground uppercase flex items-center gap-2">
                            <MediaTypeIcon type={scan.mediaType || "video"} />
                            {scan.mediaType || "video"}
                          </p>
                        </div>
                      </div>

                      {scan.detectionTags && Array.isArray(scan.detectionTags) && scan.detectionTags.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-muted-foreground mb-2">DETECTION TAGS</p>
                          <div className="flex flex-wrap gap-2">
                            {scan.detectionTags.map((tag: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary border border-primary/30 rounded-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {scan.analysisSummary && (
                        <div className="bg-black/30 border border-primary/10 rounded-sm p-3">
                          <p className="text-[10px] font-mono text-muted-foreground mb-1">ANALYSIS SUMMARY</p>
                          <p className="text-sm font-mono text-foreground/80">{scan.analysisSummary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TacticalCard>
              );
            })}
          </div>
        )}

        {activeTab === "mitigation" && (
          <div className="space-y-6">
            <TacticalCard className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                GENERATE MITIGATION GUIDANCE
              </h3>
              <p className="text-xs text-muted-foreground font-mono mb-6">
                Generate tactical countermeasures based on exposure level and synthetic detection status.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-primary/70 mb-2 block">EXPOSURE LEVEL</label>
                  <select
                    data-testid="select-exposure-level"
                    value={exposureLevel}
                    onChange={(e) => setExposureLevel(e.target.value)}
                    className="w-full bg-black/50 border border-primary/30 text-foreground font-mono text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-mono text-primary/70">SYNTHETIC MEDIA DETECTED</label>
                  <button
                    type="button"
                    onClick={() => setSyntheticDetected(!syntheticDetected)}
                    className={`px-3 py-1 rounded-sm border text-xs font-mono transition-all ${
                      syntheticDetected
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-black/30 text-muted-foreground border-primary/10"
                    }`}
                  >
                    {syntheticDetected ? "YES" : "NO"}
                  </button>
                </div>

                <button
                  data-testid="button-generate-mitigation"
                  onClick={handleGenerateMitigation}
                  disabled={mitigationMutation.isPending}
                  className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-3 font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
                >
                  {mitigationMutation.isPending ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      GENERATE COUNTERMEASURES
                    </>
                  )}
                </button>
              </div>
            </TacticalCard>

            {guidance.length > 0 && (
              <TacticalCard className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  TACTICAL COUNTERMEASURES
                </h3>
                <div className="space-y-3">
                  {guidance.map((item, i) => (
                    <div
                      key={i}
                      data-testid={`text-guidance-${i}`}
                      className="flex items-start gap-3 bg-black/30 border border-primary/10 rounded-sm p-3"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-primary/20 border border-primary/30 rounded-sm flex items-center justify-center">
                        <span className="text-[10px] font-mono text-primary font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm font-mono text-foreground/80">{item}</p>
                    </div>
                  ))}
                </div>
              </TacticalCard>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
