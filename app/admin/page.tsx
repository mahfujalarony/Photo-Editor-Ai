import { headers } from "next/headers";

type GalleryItem = {
  id: string;
  imageUrl: string;
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
};

async function loadGallery(): Promise<GalleryResponse> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return { total: 0, items: [] };
  }

  const response = await fetch(
    `${protocol}://${host}/api/admin/generated-images?tool=all&limit=60`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return { total: 0, items: [], error: "Could not load the gallery." };
  }

  const payload = (await response.json().catch(() => null)) as
    | GalleryResponse
    | null;

  return payload ?? { total: 0, items: [] };
}

export default async function Page() {
  const gallery = await loadGallery();
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.outputName}
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-1 px-4 py-3">
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
      </div>
    </div>
  );
}
