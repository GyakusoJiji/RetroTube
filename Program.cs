using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace RetroTubeServer
{
    // Define clean records to match the frontend expected video structure
    public record Thumbnail(string Url);
    public record ThumbnailSet(Thumbnail Medium, Thumbnail High);
    public record VideoItem(
        string Id,
        string Title,
        string ChannelTitle,
        string PublishedAt,
        string Description,
        ThumbnailSet Thumbnails
    );

    public class Program
    {
        private static readonly HttpClient HttpClient = new HttpClient();

        // 20 Retro Video Mock Database ported from mockData.js
        private static readonly List<VideoItem> MockVideos = new()
        {
            new VideoItem(
                "jNQXAC9IVRw",
                "Me at the zoo",
                "jawed",
                "2005-04-23T20:31:52Z",
                "The first video on YouTube. Inside San Diego Zoo in front of the elephants.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg"))
            ),
            new VideoItem(
                "dMH0bHeiRNg",
                "Evolution of Dance - Judson Laipply",
                "Judson Laipply",
                "2006-04-06T21:00:00Z",
                "The famous compilation of classic dance moves throughout history. One of the first massive viral videos.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/dMH0bHeiRNg/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/dMH0bHeiRNg/hqdefault.jpg"))
            ),
            new VideoItem(
                "_OBlgSz8sSM",
                "Charlie bit my finger - again!",
                "HDCYT",
                "2007-05-22T12:00:00Z",
                "Two brothers playing, and Charlie biting Harry's finger. A cultural phenomenon.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/_OBlgSz8sSM/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/_OBlgSz8sSM/hqdefault.jpg"))
            ),
            new VideoItem(
                "J---aiyznGQ",
                "Keyboard Cat Original",
                "blooper1993",
                "2007-06-07T12:00:00Z",
                "Fatso the cat playing a catchy tune on a electronic keyboard in the 1980s.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/J---aiyznGQ/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/J---aiyznGQ/hqdefault.jpg"))
            ),
            new VideoItem(
                "EwTZ2xpQwpA",
                "Chocolate Rain** Original Song by Tay Zonday",
                "Tay Zonday",
                "2007-04-22T00:00:00Z",
                "Tay Zonday sings his original composition 'Chocolate Rain' with his signature deep voice. **I move away from the mic to breathe in.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/EwTZ2xpQwpA/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/EwTZ2xpQwpA/hqdefault.jpg"))
            ),
            new VideoItem(
                "kHmvkRoEowc",
                "Leave Britney Alone!",
                "Chris Crocker",
                "2007-09-10T00:00:00Z",
                "Chris Crocker defends Britney Spears in an emotional webcam recording, expressing deep concern for her well-being.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/kHmvkRoEowc/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/kHmvkRoEowc/hqdefault.jpg"))
            ),
            new VideoItem(
                "wCF3ywukQYA",
                "Shoes - Kelly (Official Video)",
                "Liamkylesullivan",
                "2007-05-10T00:00:00Z",
                "Kelly wants shoes. She is going to get them. A classic YouTube comedy music video.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/wCF3ywukQYA/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/wCF3ywukQYA/hqdefault.jpg"))
            ),
            new VideoItem(
                "hYWHJWyO5Gs",
                "The Llama Song",
                "superflux",
                "2008-02-09T00:00:00Z",
                "Here a llama, there a llama, everywhere a llama llama. Classic Flash animation brought to YouTube.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/hYWHJWyO5Gs/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/hYWHJWyO5Gs/hqdefault.jpg"))
            ),
            new VideoItem(
                "dQw4w9WgXcQ",
                "Rick Astley - Never Gonna Give You Up (Official Music Video)",
                "Official Rick Astley",
                "2009-10-25T06:57:33Z",
                "The official video for Rick Astley's 'Never Gonna Give You Up' - the absolute king of internet memes.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"))
            ),
            new VideoItem(
                "txqiwrbYGeg",
                "David After Dentist",
                "booba123",
                "2009-01-30T00:00:00Z",
                "Is this real life? David's hilarious response to anesthesia after visiting the dentist.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/txqiwrbYGeg/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/txqiwrbYGeg/hqdefault.jpg"))
            ),
            new VideoItem(
                "lZMzn4nMCdU",
                "The Ultimate Showdown of Ultimate Destiny",
                "Lemon Demon",
                "2009-01-16T00:00:00Z",
                "Good guys, bad guys, and explosions as far as the eye can see. A legendary early Flash animation.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/lZMzn4nMCdU/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/lZMzn4nMCdU/hqdefault.jpg"))
            ),
            new VideoItem(
                "dTAAsCNK7RA",
                "OK Go - Here It Goes Again (Treadmills)",
                "OK Go",
                "2009-02-26T00:00:00Z",
                "The incredible treadmill choreography that propelled OK Go into YouTube stardom.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/dTAAsCNK7RA/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/dTAAsCNK7RA/hqdefault.jpg"))
            ),
            new VideoItem(
                "2B-XwPjn9YY",
                "Steve Jobs introduces Macintosh (1984)",
                "Apple Retro",
                "2010-01-25T00:00:00Z",
                "Steve Jobs unveils the original Macintosh computer, showcasing its graphics capabilities and text-to-speech.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/2B-XwPjn9YY/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/2B-XwPjn9YY/hqdefault.jpg"))
            ),
            new VideoItem(
                "OQSNhk5ICTI",
                "Yosemite Bear Mountain Double Rainbow 1-8-10",
                "Yosemitebear62",
                "2010-01-08T00:00:00Z",
                "It's a double rainbow all the way! Oh my God. What does this mean? It's so bright, it's so vivid.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/OQSNhk5ICTI/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/OQSNhk5ICTI/hqdefault.jpg"))
            ),
            new VideoItem(
                "QH2-TGUlwu4",
                "Nyan Cat [original]",
                "saraj00n",
                "2011-04-05T14:00:00Z",
                "A cat with a Pop-Tart body flies through space leaving a rainbow trail, set to an addictive Japanese vocaloid tune.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/QH2-TGUlwu4/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/QH2-TGUlwu4/hqdefault.jpg"))
            ),
            new VideoItem(
                "L0dFm7jYF8c",
                "1980s Retro Video Arcade Commercial",
                "ArcadeNostalgia",
                "2011-10-18T00:00:00Z",
                "A nostalgic local television commercial for a classic video game arcade featuring Pac-Man, Centipede, and Galaga.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/L0dFm7jYF8c/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/L0dFm7jYF8c/hqdefault.jpg"))
            ),
            new VideoItem(
                "9bZkp7q19f0",
                "PSY - GANGNAM STYLE (강남스타일) M/V",
                "officialpsy",
                "2012-07-15T07:46:32Z",
                "The viral sensation that broke YouTube's view counter. The horse dance that conquered the globe.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg"))
            ),
            new VideoItem(
                "95tBfO1T_xg",
                "Windows 95 Launch Promo Video (with Jay Leno)",
                "RetroPC",
                "2013-08-20T00:00:00Z",
                "Microsoft's promotional campaign for Windows 95 featuring Jay Leno, explaining taskbars, start menus, and plug-and-play.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/95tBfO1T_xg/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/95tBfO1T_xg/hqdefault.jpg"))
            ),
            new VideoItem(
                "m4kO5geYwPA",
                "Sony PlayStation 1 Launch Commercial (1995)",
                "PlayStationClassics",
                "2008-03-24T00:00:00Z",
                "U R NOT E. The dark, industrial PlayStation 1 launch commercial warning you about the power of the PS1.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/m4kO5geYwPA/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/m4kO5geYwPA/hqdefault.jpg"))
            ),
            new VideoItem(
                "LKYPYjAlMiU",
                "Daft Punk - Around The World (Official Music Video)",
                "Daft Punk",
                "2009-02-26T00:00:00Z",
                "Michel Gondry's iconic choreographed music video for Daft Punk's smash hit 'Around The World'.",
                new ThumbnailSet(new Thumbnail("https://img.youtube.com/vi/LKYPYjAlMiU/mqdefault.jpg"), new Thumbnail("https://img.youtube.com/vi/LKYPYjAlMiU/hqdefault.jpg"))
            )
        };

        [STAThread]
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions
            {
                Args = args,
                ContentRootPath = AppDomain.CurrentDomain.BaseDirectory
            });
            
            // Add Developer Services
            builder.Services.AddDirectoryBrowser();

            var webApp = builder.Build();

            // Set up Default Files (e.g. index.html) and Static Files serving (from wwwroot)
            webApp.UseDefaultFiles();
            webApp.UseStaticFiles();

            // 1. Search API endpoint: proxy to Google YouTube API or search Mock local database
            webApp.MapGet("/api/search", async (HttpContext context) =>
            {
                var query = context.Request.Query["q"].ToString() ?? "";
                var before = context.Request.Query["before"].ToString();
                var order = context.Request.Query["order"].ToString() ?? "relevance";

                // Read API key from the request header sent by the client
                context.Request.Headers.TryGetValue("X-YouTube-API-Key", out var apiKeyValues);
                var apiKey = apiKeyValues.ToString()?.Trim();

                if (string.IsNullOrEmpty(apiKey))
                {
                    // Fallback to C# Local Mock Search
                    var results = SearchMockVideos(query, before);
                    return Results.Ok(results);
                }
                else
                {
                    // Query live YouTube API
                    try
                    {
                        var results = await SearchYouTubeAPI(apiKey, query, before, order);
                        return Results.Ok(results);
                    }
                    catch (Exception ex)
                    {
                        return Results.Problem(
                            detail: ex.Message,
                            statusCode: 500,
                            title: "YouTube API Error"
                        );
                    }
                }
            });

            // Set background host port to match port 3000
            webApp.Urls.Add("http://localhost:3000");

            // Start Webhost asynchronously in a background task
            Task.Run(async () =>
            {
                try
                {
                    await webApp.StartAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WebHost Error] Failed to start server: {ex.Message}");
                }
            });

            // Start the WPF GUI Application (STA Thread required)
            var wpfApp = new RetroTube.App();
            wpfApp.InitializeComponent();
            wpfApp.Run();

            // Cleanly stop webhost when WPF app exits
            webApp.StopAsync().GetAwaiter().GetResult();
        }

        // C# Local Mock Database search with date cutoff filters
        private static List<VideoItem> SearchMockVideos(string query, string? publishedBefore)
        {
            var q = query.Trim().ToLowerInvariant();
            
            DateTime? cutoffDate = null;
            if (!string.IsNullOrEmpty(publishedBefore) && DateTime.TryParse(publishedBefore, out var dt))
            {
                cutoffDate = dt.ToUniversalTime();
            }

            return MockVideos.Where(video =>
            {
                // 1. Date Filter: Video published date must be strictly BEFORE the cutoff date
                if (cutoffDate.HasValue)
                {
                    if (DateTime.TryParse(video.PublishedAt, out var pubDate))
                    {
                        if (pubDate.ToUniversalTime() >= cutoffDate.Value)
                        {
                            return false;
                        }
                    }
                }

                // 2. Keyword query filter (searches title, channel name, or description)
                if (!string.IsNullOrEmpty(q))
                {
                    var matchTitle = video.Title.ToLowerInvariant().Contains(q);
                    var matchChannel = video.ChannelTitle.ToLowerInvariant().Contains(q);
                    var matchDesc = video.Description.ToLowerInvariant().Contains(q);
                    return matchTitle || matchChannel || matchDesc;
                }

                return true;
            }).ToList();
        }

        // Live YouTube API Query using HttpClient
        private static async Task<List<VideoItem>> SearchYouTubeAPI(string apiKey, string query, string? before, string order)
        {
            var url = $"https://www.googleapis.com/youtube/v3/search?key={Uri.EscapeDataString(apiKey)}&part=snippet&type=video&maxResults=25&q={Uri.EscapeDataString(query)}&order={Uri.EscapeDataString(order)}";
            
            // Format cutoff datetime to RFC 3339 UTC format
            if (!string.IsNullOrWhiteSpace(before) && DateTime.TryParse(before, out var dt))
            {
                var rfc3339 = dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");
                url += $"&publishedBefore={Uri.EscapeDataString(rfc3339)}";
            }

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            var response = await HttpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                var errorMessage = "YouTube API Error";
                try
                {
                    using var errDoc = JsonDocument.Parse(errorContent);
                    if (errDoc.RootElement.TryGetProperty("error", out var errorEl) &&
                        errorEl.TryGetProperty("message", out var msgEl))
                    {
                        errorMessage = msgEl.GetString() ?? errorMessage;
                    }
                }
                catch
                {
                    // Fallback on JSON parse failure
                }
                throw new Exception($"{errorMessage} (HTTP {response.StatusCode})");
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            var list = new List<VideoItem>();

            if (doc.RootElement.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in itemsEl.EnumerateArray())
                {
                    // Ensure it is a valid video item
                    if (!item.TryGetProperty("id", out var idEl) || !idEl.TryGetProperty("videoId", out var videoIdEl))
                        continue;

                    var videoId = videoIdEl.GetString();
                    if (string.IsNullOrEmpty(videoId))
                        continue;

                    if (!item.TryGetProperty("snippet", out var snippetEl))
                        continue;

                    var title = snippetEl.TryGetProperty("title", out var titleEl) ? titleEl.GetString() ?? "" : "";
                    var channelTitle = snippetEl.TryGetProperty("channelTitle", out var chanEl) ? chanEl.GetString() ?? "" : "";
                    var publishedAt = snippetEl.TryGetProperty("publishedAt", out var pubEl) ? pubEl.GetString() ?? "" : "";
                    var description = snippetEl.TryGetProperty("description", out var descEl) ? descEl.GetString() ?? "" : "";

                    // Extract standard image resolution thumbnails
                    var mediumUrl = "";
                    var highUrl = "";
                    if (snippetEl.TryGetProperty("thumbnails", out var thumbsEl))
                    {
                        if (thumbsEl.TryGetProperty("medium", out var medEl) && medEl.TryGetProperty("url", out var medUrlEl))
                            mediumUrl = medUrlEl.GetString() ?? "";
                        if (thumbsEl.TryGetProperty("high", out var hiEl) && hiEl.TryGetProperty("url", out var hiUrlEl))
                            highUrl = hiUrlEl.GetString() ?? "";
                    }

                    list.Add(new VideoItem(
                        videoId,
                        title,
                        channelTitle,
                        publishedAt,
                        description,
                        new ThumbnailSet(new Thumbnail(mediumUrl), new Thumbnail(highUrl))
                    ));
                }
            }

            return list;
        }
    }
}
