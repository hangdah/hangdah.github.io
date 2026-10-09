import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { SITE } from "@/config";

export async function GET(context: APIContext) {
  const documents = (await getCollection("docs")).sort(
    (a, b) => b.data.updated.getTime() - a.data.updated.getTime(),
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: documents.map((doc) => ({
      title: doc.data.title,
      description: doc.data.description,
      pubDate: doc.data.updated,
      link: `/docs/${doc.id}/`,
    })),
  });
}
