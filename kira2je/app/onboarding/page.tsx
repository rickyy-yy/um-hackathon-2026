import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Onboarding() {
  const session = await getSession();
  if (!session) redirect('/');

  return (
    <main className="px-6 pt-10 pb-16">
      <h1 className="serif text-3xl text-kira-dark mb-2">Jom mula!</h1>
      <p className="text-kira-muted mb-8">
        Macam mana anda catat jualan sekarang?
      </p>

      <div className="space-y-3">
        <Link
          href="/upload/csv"
          className="card-sage block active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">📁</div>
            <div>
              <div className="font-semibold mb-1">Ada fail dari POS</div>
              <div className="text-sm text-kira-muted">
                Muat naik CSV atau Excel dari StoreHub, Slurp, Qashier, dll.
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/upload/photo"
          className="card-sage block active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">📷</div>
            <div>
              <div className="font-semibold mb-1">Ada buku / resit</div>
              <div className="text-sm text-kira-muted">
                Ambil gambar atau pilih dari galeri. Boleh upload banyak.
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/upload/chat"
          className="card-sage block active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl">💬</div>
            <div>
              <div className="font-semibold mb-1">Saya ingat je</div>
              <div className="text-sm text-kira-muted">
                Jawab soalan pendek, kami susun data anda.
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link href="/dashboard" className="text-sm text-kira-muted underline">
          Lompat ke laporan (jika dah ada data)
        </Link>
      </div>
    </main>
  );
}
