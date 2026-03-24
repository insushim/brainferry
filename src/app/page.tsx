'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, ChevronRight, Sparkles, Puzzle, Zap, Volume2, Lightbulb, BarChart3, Infinity, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORIES } from '@/engines/types';
import { MiniRiverDemo } from '@/components/landing/MiniRiverDemo';

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

const stats = [
  { label: '무한한 퍼즐', value: '\u221E', icon: Infinity },
  { label: '카테고리', value: '10가지', icon: Puzzle },
  { label: 'AI 비용', value: '0원', icon: Zap },
];

const features = [
  { icon: Infinity, title: '무한 생성', desc: '수학적 알고리즘으로 매번 새로운 퍼즐' },
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

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center w-full">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI 없이 수학으로 무한 생성
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                무한한
              </span>
              <br />
              두뇌 퍼즐
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-lg">
              순수 알고리즘이 만들어내는 끝없는 도전. 10가지 카테고리, 10단계 난이도로 매번 새로운 퍼즐을 즐기세요.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/play">
                <Button size="lg" className="gap-2">
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

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <MiniRiverDemo />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[var(--bg-secondary)]/50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-8" {...staggerContainer}>
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                {...staggerItem}
                className="flex flex-col items-center text-center p-6"
              >
                <stat.icon className="w-8 h-8 text-primary mb-3" />
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-[var(--text-secondary)] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Category Showcase */}
      <section id="categories" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">10가지 카테고리</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              클래식 강건너기부터 논리 격자까지, 다양한 두뇌 퍼즐을 즐겨보세요
            </p>
          </motion.div>

          <div className="overflow-x-auto category-scroll pb-4">
            <motion.div
              className="flex gap-5 min-w-max px-4"
              {...staggerContainer}
            >
              {CATEGORIES.map((cat) => (
                <motion.div key={cat.id} {...staggerItem}>
                  <Link href={`/play/${cat.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -8 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-52 bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 cursor-pointer hover:shadow-xl transition-shadow"
                      style={{ borderTopColor: cat.color, borderTopWidth: '3px' }}
                    >
                      <div className="text-5xl mb-4">{cat.emoji}</div>
                      <h3 className="text-lg font-bold mb-2">{cat.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{cat.description}</p>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[var(--bg-secondary)]/50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div className="text-center mb-16" {...fadeInUp}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">시작하는 방법</h2>
            <p className="text-[var(--text-secondary)] text-lg">3단계로 간단하게!</p>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-8" {...staggerContainer}>
            {howItWorks.map((item, i) => (
              <motion.div key={item.step} {...staggerItem} className="relative">
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 text-center h-full">
                  <div className="text-5xl mb-4">{item.emoji}</div>
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-3">
                    STEP {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-[var(--text-secondary)]">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ChevronRight className="w-8 h-8 text-primary/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
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
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp}>
            <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-12 border border-primary/20">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">지금 무료로 시작하세요</h2>
              <p className="text-[var(--text-secondary)] text-lg mb-8">
                설치 없이 바로 플레이. AI API 비용 0원.
              </p>
              <Link href="/play">
                <Button size="lg" className="gap-2 text-lg">
                  <Play className="w-6 h-6" />
                  퍼즐 도전하기
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 text-center text-[var(--text-secondary)] text-sm">
          <p>BrainFerry &copy; 2024. 순수 알고리즘으로 무한 생성되는 퍼즐.</p>
        </div>
      </footer>
    </div>
  );
}
