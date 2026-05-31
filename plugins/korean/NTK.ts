import { Plugin } from "@libs/plugin";
import { Fetcher } from "@libs/fetcher";
import { Novel } from "@libs/novel";
import { Chapter } from "@libs/chapter";

class NTKNovelPlugin implements Plugin {
    id = "ntk_novel";
    name = "NTK Novel";
    icon = "icon.png";
    site = "https://sbxh3.com";
    version = "1.0.0";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": this.site,
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json"
        };
    }

    async popularNovels(page: number): Promise<Novel[]> {
        const url = `${this.site}/novel?page=${page}&sort=views`;
        const response = await fetch(url, { headers: this.getHeaders() });
        const html = await response.text();
        
        const novels: Novel[] = [];
        const jsonMatch = html.match(/initialNovels\s*=\s*([^\n;]+)/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            for (const item of data) {
                novels.push({
                    name: item.title,
                    url: `${this.site}/novel/${item.id}`,
                    cover: item.cover || `${this.site}/og-default.png`
                });
            }
        }
        return novels;
    }

    async parseNovel(novelUrl: string): Promise<Novel> {
        const response = await fetch(novelUrl, { headers: this.getHeaders() });
        const html = await response.text();

        const novel: Novel = {
            name: html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.trim() || "Unknown",
            url: novelUrl,
            chapters: []
        };

        const chaptersMatch = html.match(/initialChapters\s*=\s*([^\n;]+)/);
        if (chaptersMatch && novel.chapters) {
            const chaptersData = JSON.parse(chaptersMatch[1]);
            for (const ch of chaptersData) {
                novel.chapters.push({
                    name: ch.title,
                    url: `${this.site}/novel/${ch.novelId}/${ch.id}`
                });
            }
        }
        return novel;
    }

    async parseChapter(chapterUrl: string): Promise<string> {
        const response = await fetch(chapterUrl, { headers: this.getHeaders() });
        const html = await response.text();

        const tokenMatch = html.match(/"token"\s*:\s*"([^"]+)"/);
        const novelIdMatch = html.match(/"novelId"\s*:\s*"([^"]+)"/);
        const episodeIdMatch = html.match(/"episodeId"\s*:\s*"([^"]+)"/);

        if (!tokenMatch || !novelIdMatch || !episodeIdMatch) {
            return "소설 토큰 정보를 불러오지 못했습니다. (JS 로딩 필요)";
        }

        const apiUrl = `${this.site}/api/novel-content`;
        const requestBody = {
            novelId: novelIdMatch[1],
            episodeId: episodeIdMatch[1],
            token: tokenMatch[1]
        };

        const apiResponse = await fetch(apiUrl, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(requestBody)
        });

        const jsonResult = await apiResponse.json();
        return jsonResult.content || jsonResult.text || "본문 내용이 비어있습니다.";
    }

    async searchNovels(searchTerm: string, page: number): Promise<Novel[]> {
        const url = `${this.site}/search?q=${encodeURIComponent(searchTerm)}&kind=novel&page=${page}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        const html = await response.text();
        
        const novels: Novel[] = [];
        const jsonMatch = html.match(/searchResult\s*=\s*([^\n;]+)/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            for (const item of data) {
                novels.push({
                    name: item.title,
                    url: `${this.site}/novel/${item.id}`,
                    cover: item.cover
                });
            }
        }
        return novels;
    }
}

export default new NTKNovelPlugin();
