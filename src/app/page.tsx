'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Play, ChevronRight, Sparkles, Puzzle, Zap, Volume2, Lightbulb, BarChart3, Infinity as InfinityIcon, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/engines/types';
import { MiniRiverDemo } from '@/components/landing/MiniRiverDemo';

/* ─── Animation Variants ─── */

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

/* ─── Floating Puzzle Pieces ─── */

const FLOATING_EMOJIS = ['🧩', '🎯', '🔥', '🗼', '🫗', '🚣', '⚖️', '💡', '🛡️', '🔢', '⚔️'];

function FloatingPieces() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {FLOATING_EMOJIS.map((emoji, i) => (
        <div
          key={i}
          className="absolute animate-float-slow opacity-[0.07] text-4xl sm:text-5xl select-none"
          style={{
            left: `${(i * 17 + 5) % 90}%`,
            top: `${(i * 13 + 10) % 80}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

/* ─── Typewriter Component ─── */

function Typewriter({ texts, speed = 80, pause = 2000 }: { texts: string[]; speed?: number; pause?: number }) {
  const [currentText, setCurrentText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const text = texts[textIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < text.length) {
          setCurrentText(text.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        if (charIndex > 0) {
          setCurrentText(text.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

  return (
    <span>
      {currentText}
      <span className="typewriter-cursor" />
    </span>
  );
}

/* ─── Animated Counter ─── */

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

/* ─── Category Mini Preview Animations ─── */

const CATEGORY_PREVIEWS: Record<string, React.ReactNode> = {
  'river-crossing': (
    <div className="flex items-center gap-1 justify-center">
      <span className="mini-boat text-sm">🚣</span>
      <span className="text-blue-400/60 text-xs">~~~</span>
    </div>
  ),
  'escort-mission': (
    <div className="flex items-center gap-0.5 justify-center">
      <span className="mini-escort text-sm">⚔️</span>
      <span className="text-xs opacity-60">→</span>
      <span className="text-sm">🛡️</span>
    </div>
  ),
  'bridge-torch': (
    <div className="flex items-center gap-1 justify-center">
      <span className="mini-torch text-sm">🔥</span>
      <span className="text-xs text-amber-400/60">━━━</span>
    </div>
  ),
  'water-jug': (
    <div className="relative w-6 h-8 mx-auto border-2 border-cyan-400/40 rounded-b-md overflow-hidden">
      <div className="absolute bottom-0 inset-x-0 bg-cyan-400/40 mini-water" />
    </div>
  ),
  'tower-hanoi': (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-4 h-1 bg-accent/50 rounded mini-disc" />
      <div className="w-6 h-1 bg-accent/40 rounded" />
      <div className="w-8 h-1 bg-accent/30 rounded" />
    </div>
  ),
  'bodyguard': (
    <div className="flex items-center gap-1 justify-center">
      <span className="mini-shield text-sm">🛡️</span>
    </div>
  ),
  'logic-grid': (
    <div className="grid grid-cols-3 gap-0.5 w-8 mx-auto">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="w-2 h-2 rounded-sm bg-pink-400/40" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  ),
  'switch-light': (
    <div className="flex gap-1 justify-center">
      <span className="mini-light text-sm">💡</span>
      <span className="mini-light text-sm" style={{ animationDelay: '0.3s' }}>💡</span>
      <span className="mini-light text-sm" style={{ animationDelay: '0.6s' }}>💡</span>
    </div>
  ),
  'balance-scale': (
    <div className="flex items-center justify-center">
      <span className="mini-scale text-sm">⚖️</span>
    </div>
  ),
  'sequence-sort': (
    <div className="flex gap-0.5 justify-center items-end">
      {[3, 1, 4, 2].map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-t bg-teal-400/50 mini-sort"
          style={{ height: `${h * 4}px`, animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  ),
};

/* ─── Main Data ─── */

const stats = [
  { label: '매일 새로운 퍼즐', value: 24847, suffix: '+', icon: Puzzle },
  { label: '카테고리', value: 10, suffix: '가지', icon: Sparkles },
  { label: 'AI 비용', value: 0, suffix: '원', icon: Zap },
];

const features = [
  { icon: InfinityIcon, title: '무한 생성', desc: '수학적 알고리즘으로 매번 새로운 퍼즐' },
  { icon: BarChart3, title: '난이도 조절', desc: '1~10단계 난이도 자유 설정' },
  { icon: Lightbulb, title: '힌트 시스템', desc: '막힐 때 단계별 힌트 제공' },
  { icon: Volume2, title: '사운드 효과', desc: '몰입감 높이는 WebAudio 사운드' },
  { icon: Brain, title: '오프라인 지원', desc: 'PWA로 인터넷 없이도 플레이' },
  { icon: Sparkles, title: '순수 알고리즘', desc: 'AI API 없이 수학만으로 생성' },
];

const howItWorks = [
  { step: '01', title: '카테고리 선택', desc: '10가지 카테고리 중 원하는 퍼즐을 고르세요', emoji: '🎯' },
  { step: '02', title: '퍼즐 생성', desc: '난이도를 설정하면 즉시 새 퍼즐이 만들어집니다', emoji: '⚡' },
  { step: '03', title: '도전!', desc: '최적 경로를 찾아 퍼즐을 풀어보세요', emoji: '🏆' },
];

/* ─── Page Component ─── */

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* ════════ Hero Section ════════ */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center">
        <div className="absolute inset-0 mesh-gradient-hero" />
        <FloatingPieces />

        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20 grid lg:grid-cols-2 gap-12 items-center w-full relative z-10">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              AI 없이 수학으로 무한 생성
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold leading-[1.1] mb-6">
              <span className="gradient-text-animated">
                무한한
              </span>
              <br />
              <span className="text-[var(--text)]">두뇌 퍼즐</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--text-secondary)] mb-4 max-w-lg leading-relaxed">
              순수 알고리즘이 만들어내는 끝없는 도전.
            </p>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-lg h-8">
              <Typewriter
                texts={[
                  '매번 다른 규칙, 매번 새로운 도전',
                  '10가지 카테고리, 10단계 난이도',
                  '설치 없이 바로 플레이',
                  'AI API 비용 0원',
                ]}
                speed={70}
                pause={2500}
              />
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/play">
                <Button size="lg" variant="gradient" glow className="gap-2">
                  <Play className="w-5 h-5" />
                  지금 시작하기
                </Button>
              </Link>
              <a href="#categories">
                <Button variant="secondary" size="lg" className="gap-2">
                  카테고리 보기
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Right: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:block"
          >
            <MiniRiverDemo />
          </motion.div>
        </div>
      </section>

      {/* ════════ Live Counter / Stats Section ════════ */}
      <section className="py-20 relative">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">지금까지 생성된 퍼즐</h2>
            <div className="text-5xl sm:text-6xl font-extrabold gradient-text-animated">
              <AnimatedCounter target={24847} duration={2500} />+
            </div>
          </motion.div>

          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-8" {...staggerContainer}>
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                {...staggerItem}
                className="flex flex-col items-center text-center p-6 glass rounded-2xl"
              >
                <stat.icon className="w-8 h-8 text-primary mb-3" />
                <div className="text-3xl sm:text-4xl font-extrabold gradient-text-animated mb-1">
                  {stat.value === 0 ? '0' : <AnimatedCounter target={stat.value} />}
                  {stat.suffix}
                </div>
                <div className="text-[var(--text-secondary)] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ Category Showcase ════════ */}
      <section id="categories" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">10가지 카테고리</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              클래식 강건너기부터 논리 격자까지, 다양한 두뇌 퍼즐을 즐겨보세요
            </p>
          </motion.div>

          <div className="overflow-x-auto category-scroll pb-6 -mx-4 px-4">
            <motion.div
              className="flex gap-5 min-w-max"
              {...staggerContainer}
            >
              {CATEGORIES.map((cat) => (
                <motion.div key={cat.id} {...staggerItem}>
                  <Link href={`/play/${cat.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -10 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-[280px] glass-card rounded-2xl p-6 cursor-pointer card-hover-lift gradient-border group"
                      style={{ borderLeftColor: cat.color, borderLeftWidth: '3px' }}
                    >
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        {cat.emoji}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{cat.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                        {cat.description}
                      </p>
                      {/* Mini Preview Animation on Hover */}
                      <div className="h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {CATEGORY_PREVIEWS[cat.id]}
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ How It Works (Timeline) ════════ */}
      <section className="py-20 relative">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">시작하는 방법</h2>
            <p className="text-[var(--text-secondary)] text-lg">3단계로 간단하게!</p>
          </motion.div>

          <div className="relative">
            {/* Connecting Line (desktop) */}
            <div className="hidden md:block absolute top-[60px] left-[calc(16.67%+30px)] right-[calc(16.67%+30px)] h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

            <motion.div className="grid md:grid-cols-3 gap-8" {...staggerContainer}>
              {howItWorks.map((item, i) => (
                <motion.div key={item.step} {...staggerItem} className="relative">
                  <div className="glass-card rounded-2xl p-8 text-center h-full">
                    {/* Step Number */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                      <span className="text-white text-2xl font-extrabold">{item.step}</span>
                    </div>
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-[var(--text-secondary)]">{item.desc}</p>
                  </div>
                  {/* Arrow between cards */}
                  {i < 2 && (
                    <div className="hidden md:flex absolute top-[60px] -right-4 z-10 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════ Features ════════ */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">특징</h2>
            <p className="text-[var(--text-secondary)] text-lg">BrainFerry만의 강점을 확인하세요</p>
          </motion.div>

          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" {...staggerContainer}>
            {features.map((feat) => (
              <motion.div
                key={feat.title}
                {...staggerItem}
                className="glass-card rounded-2xl p-6 card-hover-lift"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ Social Proof / Daily Challenge Teaser ════════ */}
      <section className="py-20 relative">
        <div className="absolute inset-0 mesh-gradient-hero opacity-20" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <motion.div {...fadeInUp}>
            <div className="flex justify-center gap-3 mb-6 text-4xl">
              {['🧩', '🎯', '🔥', '🗼', '🫗'].map((emoji, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  className="inline-block"
                >
                  {emoji}
                </motion.span>
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">매일 새로운 퍼즐이 기다립니다</h2>
            <p className="text-[var(--text-secondary)] text-lg mb-2 max-w-xl mx-auto">
              수학적 알고리즘이 만들어내는 무한한 조합. 같은 퍼즐은 두 번 다시 없습니다.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <div className="relative rounded-3xl p-12 overflow-hidden">
              {/* Animated gradient bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 animate-pulse-button rounded-3xl" />
              <div className="absolute inset-0 glass rounded-3xl" />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">지금 무료로 시작하세요</h2>
                <p className="text-[var(--text-secondary)] text-lg mb-8">
                  설치 없이 바로 플레이. AI API 비용 0원.
                </p>
                <Link href="/play">
                  <Button size="lg" variant="gradient" glow className="gap-2 text-lg">
                    <Play className="w-6 h-6" />
                    퍼즐 도전하기
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════ Footer ════════ */}
      <footer className="py-10 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold gradient-text-animated">BrainFerry</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm text-center">
              &copy; 2024 BrainFerry. 순수 알고리즘으로 무한 생성되는 퍼즐.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
