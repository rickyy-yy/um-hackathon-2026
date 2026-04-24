'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Camera, MessageCircle } from 'lucide-react';

const ICONS = {
  file: FileSpreadsheet,
  camera: Camera,
  chat: MessageCircle,
};

type Card = { href: string; icon: string; title: string; desc: string };

export function OnboardingCards({ cards, skipLabel }: { cards: Card[]; skipLabel: string }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, i) => {
          const Icon = ICONS[card.icon as keyof typeof ICONS];
          return (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
            >
              <Link href={card.href} className="card-sage block h-full">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-kira-teal/10 flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-kira-teal" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">{card.title}</div>
                    <div className="text-sm text-kira-muted">{card.desc}</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Link href="/dashboard" className="text-sm text-kira-muted underline hover:text-kira-dark transition-colors">
          {skipLabel}
        </Link>
      </motion.div>
    </>
  );
}
