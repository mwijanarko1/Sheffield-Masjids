import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const NOT_FOUND_MARKDOWN = `# Page not found

The requested Sheffield Masjids page does not exist.

- [Today's prayer times](https://www.sheffieldmasjids.com/)
- [Mosque timetables](https://www.sheffieldmasjids.com/timetable)
- [Compare mosques](https://www.sheffieldmasjids.com/compare)
- [Agent instructions](https://www.sheffieldmasjids.com/llms.txt)
- [Sitemap](https://www.sheffieldmasjids.com/sitemap.xml)
`;

export function GET(request: NextRequest) {
  if (request.headers.get("accept")?.includes("text/markdown")) {
    return new NextResponse(NOT_FOUND_MARKDOWN, {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept, Accept-Encoding",
      },
    });
  }

  notFound();
}
