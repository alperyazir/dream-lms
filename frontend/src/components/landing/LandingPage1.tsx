import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Sparkles,
  Sun,
  User,
  Users,
  Volume2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import type { Body_login_login_access_token as AccessToken } from "@/client";
import { OpenAPI } from "@/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useAuth from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// Quick login types (dev only)
interface QuickLoginUser {
  username: string;
  email: string | null;
}
interface QuickLoginUsers {
  admin: QuickLoginUser[];
  supervisor: QuickLoginUser[];
  publisher: QuickLoginUser[];
  teacher: QuickLoginUser[];
  student: QuickLoginUser[];
}

// ---------------------------------------------------------------------------
// Variant 1 — "Background Paths Hero"
// Animated SVG flowing paths (from 21st.dev/kokonutd) with spring-animated
// letter-by-letter title, glassmorphism CTA, and floating stats bar.
// ---------------------------------------------------------------------------

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-teal-800 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

const featuresDef = [
  { icon: BrainCircuit, titleKey: "feat1Title", descKey: "feat1Desc", span: "md:col-span-2" },
  { icon: Users, titleKey: "feat2Title", descKey: "feat2Desc", span: "" },
  { icon: GraduationCap, titleKey: "feat3Title", descKey: "feat3Desc", span: "" },
  { icon: Sparkles, titleKey: "feat4Title", descKey: "feat4Desc", span: "md:col-span-2" },
  { icon: Calendar, titleKey: "feat5Title", descKey: "feat5Desc", span: "" },
  { icon: ClipboardList, titleKey: "feat6Title", descKey: "feat6Desc", span: "" },
  { icon: MessageSquare, titleKey: "feat7Title", descKey: "feat7Desc", span: "" },
  { icon: BookOpen, titleKey: "feat8Title", descKey: "feat8Desc", span: "md:col-span-2" },
  { icon: BarChart3, titleKey: "feat9Title", descKey: "feat9Desc", span: "" },
] as const;

const t = {
  EN: {
    heroLine1: "Flow Learn",
    heroLine2: "with AI Innovation",
    heroLine3: "",
    heroSub: "A modern learning management system that uses artificial intelligence to personalize education, track progress, and empower every learner.",
    exploreFeatures: "Explore Features",
    featuresTitle: "Everything You Need to Teach & Learn",
    featuresSub: "A comprehensive platform connecting publishers, teachers, and students with AI-powered tools.",
    howItWorks: "How It Works",
    howItWorksSub: "From content creation to analytics — a seamless flow that connects every role.",
    step1: "Create",
    step1Desc: "Publishers create books & learning materials",
    step2: "AI Generate",
    step2Desc: "Teachers generate unique content from books using AI",
    step3: "Assign",
    step3Desc: "Teachers assign content to students or classes",
    step4: "Learn",
    step4Desc: "Students complete interactive activities",
    step5: "Analyze",
    step5Desc: "Track results with real-time analytics",
    contactTitle: "Get in Touch",
    contactSub: "Have questions or want to see a demo? We'd love to hear from you.",
    emailUs: "Email Us",
    requestDemo: "Request a Demo",
    requestDemoDesc: "See the platform in action with a personalized walkthrough.",
    partnerWithUs: "Partner With Us",
    partnerDesc: "Interested in publishing or institutional partnerships? Let's talk.",
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email",
    emailPlaceholder: "you@example.com",
    message: "Message",
    messagePlaceholder: "Tell us about your needs...",
    sendMessage: "Send Message",
    signIn: "Sign In",
    welcomeBack: "Welcome Back",
    signInSub: "Sign in to continue your learning journey",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter password",
    forgotPassword: "Forgot Password?",
    signingIn: "Signing in...",
    // Features
    feat1Title: "AI Book Analysis",
    feat1Desc: "Analyze entire books with AI to extract vocabulary lists, pronunciation audio, themes, and structured learning modules — chapter by chapter.",
    feat2Title: "School & Account Management",
    feat2Desc: "Publishers manage their schools, teacher accounts, and content distribution from a single dashboard.",
    feat3Title: "Class & Student Management",
    feat3Desc: "Teachers organize classes, enroll students, and monitor individual or group progress effortlessly.",
    feat4Title: "AI Content Generation",
    feat4Desc: "Generate quizzes, exercises, and interactive activities from book content module by module — powered by advanced AI models.",
    feat5Title: "Smart Assignments",
    feat5Desc: "Create time-based assignment plans with deadlines, scheduling, and automatic distribution to individuals or entire classes.",
    feat6Title: "Comprehensive Skill Tracking",
    feat6Desc: "Track reading, writing, listening, speaking, and grammar skills at both individual student and classroom level.",
    feat7Title: "Built-in Messaging",
    feat7Desc: "Seamless communication between students and teachers with an integrated messaging system for feedback and support.",
    feat8Title: "Interactive Flowbooks",
    feat8Desc: "Deliver rich, interactive book experiences online — or let students download portable offline apps for learning anywhere.",
    feat9Title: "Real-time Analytics & Reporting",
    feat9Desc: "Live dashboards with detailed reports by class or student — track engagement, completion rates, and performance trends.",
  },
  TR: {
    heroLine1: "Flow Learn",
    heroLine2: "Yapay Zeka",
    heroLine3: "ile Öğrenin",
    heroSub: "Eğitimi kişiselleştirmek, ilerlemeyi takip etmek ve her öğrenciyi güçlendirmek için yapay zeka kullanan modern bir öğrenme yönetim sistemi.",
    exploreFeatures: "Özellikleri Keşfet",
    featuresTitle: "Öğretmek ve Öğrenmek İçin İhtiyacınız Olan Her Şey",
    featuresSub: "Yayıncıları, öğretmenleri ve öğrencileri yapay zeka destekli araçlarla birbirine bağlayan kapsamlı bir platform.",
    howItWorks: "Nasıl Çalışır",
    howItWorksSub: "İçerik oluşturmadan analitiğe — her rolü birbirine bağlayan kesintisiz bir akış.",
    step1: "Oluştur",
    step1Desc: "Yayıncılar kitap ve öğrenme materyalleri oluşturur",
    step2: "Yapay Zeka Üret",
    step2Desc: "Öğretmenler yapay zeka ile kitaplardan özgün içerik üretir",
    step3: "Ata",
    step3Desc: "Öğretmenler içeriği öğrencilere veya sınıflara atar",
    step4: "Öğren",
    step4Desc: "Öğrenciler interaktif etkinlikleri tamamlar",
    step5: "Analiz Et",
    step5Desc: "Gerçek zamanlı analitiklerle sonuçları takip edin",
    contactTitle: "Bize Ulaşın",
    contactSub: "Sorularınız mı var veya demo görmek mi istiyorsunuz? Sizden haber almak isteriz.",
    emailUs: "E-posta Gönderin",
    requestDemo: "Demo Talep Edin",
    requestDemoDesc: "Kişiselleştirilmiş bir sunum ile platformu çalışırken görün.",
    partnerWithUs: "Ortaklık Kurun",
    partnerDesc: "Yayıncılık veya kurumsal ortaklıklarla ilgileniyor musunuz? Konuşalım.",
    name: "İsim",
    namePlaceholder: "Adınız",
    email: "E-posta",
    emailPlaceholder: "siz@ornek.com",
    message: "Mesaj",
    messagePlaceholder: "İhtiyaçlarınızdan bahsedin...",
    sendMessage: "Mesaj Gönder",
    signIn: "Giriş Yap",
    welcomeBack: "Tekrar Hoş Geldiniz",
    signInSub: "Öğrenme yolculuğunuza devam etmek için giriş yapın",
    username: "Kullanıcı Adı",
    usernamePlaceholder: "Kullanıcı adınızı girin",
    password: "Şifre",
    passwordPlaceholder: "Şifrenizi girin",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    signingIn: "Giriş yapılıyor...",
    feat1Title: "Yapay Zeka ile Kitap Analizi",
    feat1Desc: "Yapay zeka ile kitapları analiz ederek kelime listeleri, telaffuz sesleri, temalar ve bölüm bölüm yapılandırılmış öğrenme modülleri oluşturun.",
    feat2Title: "Okul ve Hesap Yönetimi",
    feat2Desc: "Yayıncılar okullarını, öğretmen hesaplarını ve içerik dağıtımını tek bir panelden yönetir.",
    feat3Title: "Sınıf ve Öğrenci Yönetimi",
    feat3Desc: "Öğretmenler sınıfları düzenler, öğrencileri kaydeder ve bireysel veya grup ilerlemesini zahmetsizce takip eder.",
    feat4Title: "Yapay Zeka İçerik Üretimi",
    feat4Desc: "Gelişmiş yapay zeka modelleri ile kitap içeriğinden modül modül sınavlar, alıştırmalar ve interaktif etkinlikler üretin.",
    feat5Title: "Akıllı Ödevler",
    feat5Desc: "Son tarihler, zamanlama ve bireylere veya tüm sınıflara otomatik dağıtım ile zamana dayalı ödev planları oluşturun.",
    feat6Title: "Kapsamlı Beceri Takibi",
    feat6Desc: "Okuma, yazma, dinleme, konuşma ve dilbilgisi becerilerini hem bireysel öğrenci hem de sınıf düzeyinde takip edin.",
    feat7Title: "Dahili Mesajlaşma",
    feat7Desc: "Geri bildirim ve destek için entegre mesajlaşma sistemi ile öğrenciler ve öğretmenler arasında kesintisiz iletişim.",
    feat8Title: "İnteraktif Flowbook'lar",
    feat8Desc: "Zengin, interaktif kitap deneyimlerini çevrimiçi sunun — veya öğrencilerin her yerde öğrenmesi için taşınabilir çevrimdışı uygulamaları indirmesine izin verin.",
    feat9Title: "Gerçek Zamanlı Analitik ve Raporlama",
    feat9Desc: "Sınıf veya öğrenci bazında detaylı raporlarla canlı panolar — katılım, tamamlanma oranları ve performans trendlerini takip edin.",
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

export default function LandingPage1() {
  const { theme, setTheme } = useTheme();
  const [lang, setLang] = useState<"EN" | "TR">("EN");
  const [loginOpen, setLoginOpen] = useState(false);
  const { loginMutation } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    defaultValues: { username: "", password: "" },
  });

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return;
    setLoginError(null);
    try {
      await loginMutation.mutateAsync(data);
    } catch (err: unknown) {
      const error = err as { body?: { detail?: string } };
      setLoginError(error.body?.detail || "Invalid credentials");
    }
  };

  // Dev quick login
  const { data: quickLoginUsers, isError: quickLoginError } = useQuery<QuickLoginUsers>({
    queryKey: ["quick-login-users"],
    queryFn: async () => {
      const res = await fetch(`${OpenAPI.BASE}/api/v1/dev/quick-login-users`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: import.meta.env.DEV && loginOpen,
    retry: false,
  });

  const instantLogin = async (username: string) => {
    setLoginError(null);
    try {
      const res = await fetch(`${OpenAPI.BASE}/api/v1/dev/instant-login/${username}`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Login failed"); }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/";
    } catch (err: unknown) {
      setLoginError((err as Error).message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-neutral-950/70 border-b border-neutral-200/50 dark:border-neutral-800/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/home" className="flex items-center gap-3">
            <img
              src="/assets/images/dreamedtech_single.svg"
              alt="Flow Learn"
              className="h-9 w-auto"
            />
            <span className="text-xl font-bold tracking-tight">
              Flow <span className="text-primary">Learn</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "EN" ? "TR" : "EN")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {lang === "EN" ? "TR" : "EN"}
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button size="sm" onClick={() => setLoginOpen(true)}>
              {t[lang].signIn}
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero — BackgroundPaths ─────────────────────────────────── */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950">
        {/* Animated SVG paths background */}
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        {/* Soft glow behind text for readability */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
          <div className="w-[70%] h-[60%] bg-white/70 dark:bg-neutral-950/70 rounded-full blur-[80px]" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="max-w-4xl mx-auto"
          >
            {/* Animated title */}
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight overflow-visible py-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-900/60 dark:from-white dark:to-white/80">
                {t[lang].heroLine1}
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 dark:from-teal-300 dark:via-white/90 dark:to-cyan-300">
                {t[lang].heroLine2}
              </span>
              {t[lang].heroLine3 && (
                <>
                  {" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 to-neutral-900/60 dark:from-white dark:to-white/80">
                    {t[lang].heroLine3}
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto mb-10"
            >
              {t[lang].heroSub}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.7 }}
              className="flex justify-center"
            >
              <Button
                asChild
                size="lg"
                className="rounded-xl px-8 py-6 text-lg font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <a href="#features">
                  {t[lang].exploreFeatures}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ── Features Bento Grid ────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t[lang].featuresTitle}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t[lang].featuresSub}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {featuresDef.map((f, i) => (
              <motion.div
                key={f.titleKey}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 1}
                className={`group relative p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ${f.span}`}
              >
                <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t[lang][f.titleKey]}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t[lang][f.descKey]}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works — Animated Step Flow ─────────────────────── */}
      <section className="py-24 px-6 bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-neutral-900 dark:text-white">
              {t[lang].howItWorks}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
              {t[lang].howItWorksSub}
            </p>
          </motion.div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-[2px] z-0">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-teal-500/0 via-teal-500/50 to-teal-500/0 origin-left"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
              {[
                { icon: BookOpen, titleKey: "step1" as const, descKey: "step1Desc" as const, color: "from-teal-500 to-teal-600" },
                { icon: Sparkles, titleKey: "step2" as const, descKey: "step2Desc" as const, color: "from-cyan-500 to-teal-500" },
                { icon: Users, titleKey: "step3" as const, descKey: "step3Desc" as const, color: "from-teal-400 to-cyan-500" },
                { icon: GraduationCap, titleKey: "step4" as const, descKey: "step4Desc" as const, color: "from-cyan-400 to-teal-400" },
                { icon: BarChart3, titleKey: "step5" as const, descKey: "step5Desc" as const, color: "from-teal-500 to-cyan-400" },
              ].map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: "easeOut" }}
                  className="flex flex-col items-center text-center group"
                >
                  {/* Icon circle */}
                  <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} p-[1px] mb-5`}>
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-neutral-950 flex items-center justify-center group-hover:bg-neutral-50 dark:group-hover:bg-neutral-900 transition-colors">
                      <step.icon className="w-8 h-8 text-teal-600 dark:text-teal-400 group-hover:text-teal-500 dark:group-hover:text-teal-300 transition-colors" />
                    </div>
                  </div>

                  {/* Step number */}
                  <span className="text-xs font-mono text-teal-600/60 dark:text-teal-500/60 mb-2">0{i + 1}</span>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{t[lang][step.titleKey]}</h3>

                  {/* Description */}
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed max-w-[180px]">
                    {t[lang][step.descKey]}
                  </p>

                  {/* Arrow (mobile only) */}
                  {i < 4 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="md:hidden mt-4 mb-2"
                    >
                      <ArrowRight className="w-5 h-5 text-teal-600/40 dark:text-teal-500/40 rotate-90" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6 bg-neutral-100 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t[lang].contactTitle}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t[lang].contactSub}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Contact info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border/50 bg-card">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t[lang].emailUs}</h3>
                  <p className="text-sm text-muted-foreground">info@flowlearn.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border/50 bg-card">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t[lang].requestDemo}</h3>
                  <p className="text-sm text-muted-foreground">{t[lang].requestDemoDesc}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl border border-border/50 bg-card">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t[lang].partnerWithUs}</h3>
                  <p className="text-sm text-muted-foreground">{t[lang].partnerDesc}</p>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="p-6 rounded-2xl border border-border/50 bg-card">
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t[lang].name}</label>
                  <input
                    type="text"
                    placeholder={t[lang].namePlaceholder}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t[lang].email}</label>
                  <input
                    type="email"
                    placeholder={t[lang].emailPlaceholder}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t[lang].message}</label>
                  <textarea
                    placeholder={t[lang].messagePlaceholder}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-sm font-semibold">
                  {t[lang].sendMessage}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">Dream Educational Technologies</span>
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Login Sheet ────────────────────────────────────────────── */}
      <Sheet open={loginOpen} onOpenChange={setLoginOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l border-border/50">
          <div className="flex flex-col h-full">
            {/* Header with gradient accent */}
            <div className="relative px-8 pt-10 pb-8">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500" />
              <SheetHeader className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src="/assets/images/dreamedtech_single.svg"
                    alt="Flow Learn"
                    className="h-10 w-auto"
                  />
                  <SheetTitle className="text-2xl font-bold tracking-tight">
                    {t[lang].welcomeBack}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-muted-foreground">
                  {t[lang].signInSub}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Login form */}
            <div className="flex-1 px-8 pb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t[lang].username}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      {...register("username", { required: "Username is required" })}
                      placeholder={t[lang].usernamePlaceholder}
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t[lang].password}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      {...register("password", { required: "Password is required" })}
                      placeholder={t[lang].passwordPlaceholder}
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-11 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                    {loginError}
                  </div>
                )}

                {/* Forgot password link removed — passwords managed by admin */}

                <Button
                  type="submit"
                  disabled={isSubmitting || loginMutation.isPending}
                  className="w-full h-11 rounded-xl font-semibold"
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t[lang].signingIn}
                    </div>
                  ) : (
                    t[lang].signIn
                  )}
                </Button>
              </form>

              {/* Dev Quick Login */}
              {import.meta.env.DEV && (
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs text-center text-muted-foreground mb-3 flex items-center justify-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
                      DEV
                    </span>
                    Quick Login
                  </p>
                  {quickLoginError && (
                    <p className="text-xs text-center text-destructive mb-2">Unavailable</p>
                  )}
                  {quickLoginUsers && (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
                      {([
                        { key: "admin" as const, label: "Admin", color: "text-amber-600 dark:text-amber-400" },
                        { key: "supervisor" as const, label: "Supervisor", color: "text-blue-600 dark:text-blue-400" },
                        { key: "publisher" as const, label: "Publisher", color: "text-rose-600 dark:text-rose-400" },
                        { key: "teacher" as const, label: "Teacher", color: "text-emerald-600 dark:text-emerald-400" },
                        { key: "student" as const, label: "Student", color: "text-purple-600 dark:text-purple-400" },
                      ]).map((role) => {
                        const users = quickLoginUsers[role.key] || [];
                        if (users.length === 0) return null;
                        return (
                          <div key={role.key} className="flex flex-wrap items-center gap-1.5">
                            <span className={`text-xs font-medium ${role.color} w-[70px] shrink-0`}>
                              {role.label}:
                            </span>
                            {users.slice(0, 5).map((u) => (
                              <Button
                                key={u.username}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => instantLogin(u.username)}
                                className="text-xs h-6 px-2 rounded"
                              >
                                {u.username}
                              </Button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
