import { headers } from "next/headers";

type TranslatedItem = {
  id: string;
  imageUrl: string;
  outputName: string;
  extractedText: string;
  createdAt: string;
  user: string;
};

type TranslateResponse = {
  total: number;
  items: TranslatedItem[];
  error?: string;
  totalPages?: number;
  currentPage?: number;
};

async function loadTranslatedTexts(page: number = 1): Promise<TranslateResponse> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return { total: 0, items: [] };
  }

  const limit = 60;
  const cookieMatch = headerList.get("cookie");
  const response = await fetch(
    `${protocol}://${host}/api/admin/generated-images?tool=image-to-text&limit=${limit}&page=${page}`,
    { 
      cache: "no-store",
      headers: cookieMatch ? { cookie: cookieMatch } : undefined,
    },
  );

  if (!response.ok) {
    return { total: 0, items: [], error: "Could not load the translated texts." };
  }

  const payload = (await response.json().catch(() => null)) as
    | TranslateResponse
    | null;

  return payload 
    ? { ...payload, totalPages: Math.ceil(payload.total / limit), currentPage: page } 
    : { total: 0, items: [] };
}

export default async function TranslateAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) || 1 : 1;
  const gallery = await loadTranslatedTexts(page);
  const items = gallery.items ?? [];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Extracted Texts</h1>
          <p className="mt-2 text-sm text-slate-600">
            Image to text translations and extractions
          </p>
        </div>

        {gallery.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {gallery.error}
          </div>
        ) : null}

        {!items.length && !gallery.error ? (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            No translated texts saved yet.
          </div>
        ) : null}

        {items.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row h-full"
              >
                <div className="w-full sm:w-2/5 shrink-0 bg-slate-100 flex items-center justify-center p-2">
                  <img
                    src={item.imageUrl}
                    alt={item.outputName}
                    className="max-h-48 w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 space-y-2 p-4 flex flex-col max-h-64 sm:max-h-[300px]">
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {item.extractedText || "No text extracted."}
                     </p>
                  </div>
                  <div className="pt-3 mt-auto border-t text-xs text-slate-500">
                    <p className="truncate font-medium">{item.outputName}</p>
                    <p>{new Date(item.createdAt).toLocaleString()}</p>
                    <p>By {item.user}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {gallery.totalPages && gallery.totalPages > 1 ? (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <a
              href={`/admin/translate?page=${Math.max(1, (gallery.currentPage || 1) - 1)}`}
              className={`px-4 py-2 text-sm font-medium border rounded-md ${
                gallery.currentPage === 1
                  ? "bg-slate-100 text-slate-400 pointer-events-none"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </a>
            <span className="text-sm font-medium text-slate-600">
              Page {gallery.currentPage} of {gallery.totalPages}
            </span>
            <a
              href={`/admin/translate?page=${Math.min(gallery.totalPages, (gallery.currentPage || 1) + 1)}`}
              className={`px-4 py-2 text-sm font-medium border rounded-md ${
                gallery.currentPage === gallery.totalPages
                  ? "bg-slate-100 text-slate-400 pointer-events-none"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}