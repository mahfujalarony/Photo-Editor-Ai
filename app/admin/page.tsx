import { headers } from "next/headers";

type GalleryItem = {
  id: string;
  imageUrl: string;
  originalImageUrl?: string | null;
  outputName: string;
  createdAt: string;
  user: string;
  width: number | null;
  height: number | null;
};

type GalleryResponse = {
  total: number;
  items: GalleryItem[];
  error?: string;
  totalPages?: number;
  currentPage?: number;
};

async function loadGallery(page: number = 1): Promise<GalleryResponse> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return { total: 0, items: [] };
  }

  const limit = 60;
  const cookieMatch = headerList.get("cookie");
  const response = await fetch(
    `${protocol}://${host}/api/admin/generated-images?tool=all&limit=${limit}&page=${page}`,
    { 
      cache: "no-store",
      headers: cookieMatch ? { cookie: cookieMatch } : undefined,
    },
  );

  if (!response.ok) {
    return { total: 0, items: [], error: "Could not load the gallery." };
  }

  const payload = (await response.json().catch(() => null)) as
    | GalleryResponse
    | null;

  return payload 
    ? { ...payload, totalPages: Math.ceil(payload.total / limit), currentPage: page } 
    : { total: 0, items: [] };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) || 1 : 1;
  const gallery = await loadGallery(page);
  const items = gallery.items ?? [];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Page</h1>
          <p className="mt-2 text-sm text-slate-600">
            All Saved Images Gallery
          </p>
        </div>

        {gallery.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {gallery.error}
          </div>
        ) : null}

        {!items.length && !gallery.error ? (
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            No images saved yet.
          </div>
        ) : null}

        {items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col"
              >
                <div className="flex flex-1">
                  {item.originalImageUrl ? (
                    <div className="w-1/2 border-r border-slate-200">
                      <div className="bg-slate-100 text-center text-xs py-1 text-slate-500 font-medium">Original</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.originalImageUrl}
                        alt="Original image"
                        className="h-48 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <div className={item.originalImageUrl ? "w-1/2" : "w-full"}>
                    {item.originalImageUrl && <div className="bg-slate-100 text-center text-xs py-1 text-slate-500 font-medium">Result</div>}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.outputName}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="space-y-1 px-4 py-3 bg-white">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {item.outputName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">By {item.user}</p>
                  {item.width && item.height ? (
                    <p className="text-xs text-slate-500">
                      {item.width} x {item.height}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {gallery.totalPages && gallery.totalPages > 1 ? (
          <div className="flex items-center justify-center space-x-2 mt-8">
            <a
              href={`/admin?page=${Math.max(1, (gallery.currentPage || 1) - 1)}`}
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
              href={`/admin?page=${Math.min(gallery.totalPages, (gallery.currentPage || 1) + 1)}`}
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
