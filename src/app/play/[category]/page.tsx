import { CATEGORIES } from '@/engines/types';
import { notFound } from 'next/navigation';
import { CategoryPlayClient } from './CategoryPlayClient';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryInfo = CATEGORIES.find((c) => c.id === category);

  if (!categoryInfo) {
    notFound();
  }

  return <CategoryPlayClient categoryId={categoryInfo.id} />;
}
