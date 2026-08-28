import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.js";
import {
  categories,
  languages,
  posts,
  postTranslations,
  users,
} from "../db/schema.js";
import { hashPassword } from "../modules/auth/password.js";

const demoUser = {
  email: "demo@blog.local",
  name: "Demo User",
  role: "admin" as const,
  password: "password123",
};

const authorUsers = [
  {
    email: "mara@blog.local",
    name: "Mara Ionescu",
    role: "author" as const,
    password: "password123",
  },
  {
    email: "andrei@blog.local",
    name: "Andrei Pavel",
    role: "author" as const,
    password: "password123",
  },
  {
    email: "ioana@blog.local",
    name: "Ioana Radu",
    role: "author" as const,
    password: "password123",
  },
  {
    email: "sofia@blog.local",
    name: "Sofia Marin",
    role: "author" as const,
    password: "password123",
  },
];

const seedLanguages = [
  {
    code: "ro",
    name: "Romanian",
    nativeName: "Română",
    isDefault: true,
    isActive: true,
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    isDefault: false,
    isActive: true,
  },
];

const seedCategories = [
  { code: "design", name: "Design", nativeName: "Design" },
  { code: "publishing", name: "Publishing", nativeName: "Publicare" },
  { code: "essays", name: "Essays", nativeName: "Eseuri" },
  { code: "product", name: "Product", nativeName: "Produs" },
];

const demoPosts = [
  {
    authorEmail: "mara@blog.local",
    title: "Cum ajută interfețele calme autorii să rămână în lucru",
    slug: "interfete-calme-pentru-autori",
    category: "design" as const,
    status: "published" as const,
    excerpt:
      "O privire practică la dashboard-uri, margini, stări de focus și micile alegeri UI care fac un instrument editorial să se simtă liniștit.",
    readTime: "6 min",
    content:
      "Un blog bun nu se simte ca o pagină încărcată, ci ca un loc în care cititorul poate intra repede în text. Spațiul liber, ierarhia clară și imaginile calme reduc zgomotul înainte ca primul paragraf să ceară atenție.\n\nEtichetele, timpul de lectură și stările de hover nu sunt ornamente. Ele spun ce fel de material urmează, câtă energie cere și unde poate merge cititorul după ce termină.\n\nO interfață pentru conținut are nevoie de reguli simple care funcționează și când apar titluri lungi, imagini lipsă sau texte traduse. Când sistemul rezistă acestor cazuri, site-ul pare lucrat, nu improvizat.",
  },
  {
    authorEmail: "andrei@blog.local",
    title: "Micul sistem editorial din spatele unui blog viu",
    slug: "mic-sistem-editorial",
    category: "publishing" as const,
    status: "published" as const,
    excerpt:
      "Categorii, ritm, articole evidențiate și cadența care păstrează homepage-ul util fără să-l transforme într-un simplu feed.",
    readTime: "8 min",
    content:
      "Publicarea nu înseamnă să pui totul pe ecran. Înseamnă să alegi ce deschide conversația, ce merită scos în față și ce poate sta în arhivă până când cititorul caută exact acel lucru.\n\nUn blog care se simte viu are repere recurente: categorii previzibile, serii, newsletter, autori recognoscibili. Aceste repere creează încredere chiar și când postările apar la intervale diferite.\n\nFiltrele, căutarea și listele populare transformă un teanc de articole într-un spațiu navigabil. Cititorul nu simte că sapă după valoare; simte că site-ul îi arată trasee posibile.",
  },
  {
    authorEmail: "ioana@blog.local",
    title: "Note despre construirea unei arhive personale la care revii",
    slug: "arhiva-personala",
    category: "essays" as const,
    status: "published" as const,
    excerpt:
      "Un blog poate fi mai mult decât recență. Tratează-l ca pe o hartă, iar cititorii vor ști de unde să înceapă și ce să salveze.",
    readTime: "5 min",
    content:
      "Eseurile bune au viață lungă dacă sunt așezate într-o structură care le lasă să fie găsite. O arhivă personală trebuie să păstreze legături între idei, nu doar o cronologie rece.\n\nUn articol mai vechi poate fi cel mai potrivit răspuns pentru un cititor nou. De aceea, homepage-ul are nevoie de zone care combină noutatea cu recomandarea editorială.\n\nUn blog memorabil nu câștigă prin volum, ci prin voce. Titlurile, descrierile și modul în care sunt grupate textele trebuie să sune ca o persoană atentă, nu ca un inventar.",
  },
  {
    authorEmail: "mara@blog.local",
    title: "De ce un dashboard de autor are nevoie de fricțiune bună",
    slug: "frictiune-dashboard-autor",
    category: "product" as const,
    status: "published" as const,
    excerpt:
      "Autosave, previzualizări, acțiuni distructive și confirmările mici care protejează munca creativă.",
    readTime: "7 min",
    content:
      "Într-un instrument de publicare, nu orice pas în plus este o problemă. Unele confirmări, previzualizări și limite îi ajută pe autori să evite greșeli care ar costa timp sau încredere.\n\nStatusul unei postări, progresul editării și istoricul schimbărilor trebuie să fie ușor de scanat. Când datele sunt aproape de acțiune, deciziile devin mai rapide.\n\nUn dashboard bun susține scrisul fără să se bage în față. El oferă control când este nevoie și liniște când autorul trebuie să rămână în text.",
  },
  {
    authorEmail: "sofia@blog.local",
    title: "Ghid pentru un dark mode citibil pe site-uri long-form",
    slug: "dark-mode-citibil",
    category: "design" as const,
    status: "published" as const,
    excerpt:
      "Temele întunecate funcționează cel mai bine cu suprafețe stratificate, text moale și reținere, nu cu negru pur dramatic.",
    readTime: "4 min",
    content:
      "Dark mode-ul pentru text lung are nevoie de contrast temperat. Negrul pur și albul agresiv obosesc rapid, mai ales când cititorul stă mult timp într-un articol.\n\nStraturile vizuale ajută mult: fundal, suprafață, card, accent. Când fiecare nivel are un rol clar, interfața rămâne lizibilă fără să pară grea.\n\nUn blog cu dark mode bun nu schimbă doar culorile. Ajustează umbrele, bordurile, accentele și imaginile astfel încât experiența să rămână coerentă.",
  },
  {
    authorEmail: "andrei@blog.local",
    title: "Homepage-ul care alege, nu doar listează",
    slug: "homepage-care-alege",
    category: "publishing" as const,
    status: "published" as const,
    excerpt:
      "Cititorii nu au nevoie de totul dintr-o dată. Au nevoie de o intrare puternică, lucruri proaspete și căi clare de explorare.",
    readTime: "6 min",
    content:
      "Un homepage editorial trebuie să facă o promisiune clară. Cititorul trebuie să înțeleagă rapid ce fel de texte găsește, care este articolul principal și unde poate continua.\n\nListele lungi pot fi utile, dar nu trebuie să fie prima impresie. O selecție bună oferă direcție și lasă restul arhivei să fie descoperit prin căutare, categorii și recomandări.\n\nCând pagina alege în locul cititorului, site-ul capătă personalitate. Nu devine mai restrictiv; devine mai ușor de parcurs.",
  },
  {
    authorEmail: "mara@blog.local",
    title: "Schiță: cum alegem imaginile pentru articole",
    slug: "schita-imagini-pentru-articole",
    category: "design" as const,
    status: "draft" as const,
    excerpt:
      "O schiță internă despre reguli vizuale pentru cover-uri, fallback-uri și imagini încărcate de autori.",
    readTime: "3 min",
    content:
      "Această postare este intenționat lăsată ca draft. Ar trebui să apară în zona de management, dar nu pe homepage și nu ca pagină publică.\n\nCând vom adăuga upload de imagini, fiecare articol va putea avea cover propriu, iar logo-ul curent va rămâne fallback editorial.",
  },
  {
    authorEmail: "sofia@blog.local",
    title: "Arhivat: notițe vechi despre layout-uri de blog",
    slug: "arhivat-layout-uri-blog",
    category: "essays" as const,
    status: "archived" as const,
    excerpt:
      "Un material păstrat pentru istoric, dar scos din circuitul public al blogului.",
    readTime: "2 min",
    content:
      "Această postare este arhivată. Rămâne vizibilă în management pentru context editorial, dar nu apare în lista publică de postări.\n\nStatusul arhivat ne ajută să păstrăm conținutul fără să-l ștergem definitiv.",
  },
];

const additionalPosts = [
  {
    authorEmail: "andrei@blog.local",
    title: "Cum construim fluxuri editoriale fără zgomot",
    slug: "fluxuri-editoriale-fara-zgomot",
    category: "publishing" as const,
    status: "published" as const,
    excerpt: "Un flux bun îi ajută pe autori să publice mai repede și să greșească mai puțin.",
    readTime: "5 min",
    content: "Fiecare pas din fluxul editorial trebuie să aibă un motiv clar. Când aprobarea, previzualizarea și publicarea sunt așezate firesc, autorul își păstrează atenția pentru text.",
  },
  {
    authorEmail: "ioana@blog.local",
    title: "Un ghid pentru arhive care pot fi explorate",
    slug: "ghid-pentru-arhive-explorabile",
    category: "essays" as const,
    status: "published" as const,
    excerpt: "O arhivă bună oferă context, legături și un punct simplu de pornire.",
    readTime: "6 min",
    content: "Arhivele utile nu sunt doar liste sortate după dată. Ele creează trasee între idei și îi ajută pe cititori să descopere texte relevante fără să caute la întâmplare.",
  },
  {
    authorEmail: "sofia@blog.local",
    title: "Designul unei pagini de articol memorabile",
    slug: "design-pagina-articol-memorabila",
    category: "design" as const,
    status: "published" as const,
    excerpt: "Tipografia, ritmul și spațiul alb dau unui articol o voce vizuală recognoscibilă.",
    readTime: "4 min",
    content: "Pagina de articol trebuie să dispară suficient cât cititorul să rămână cu ideea. Detaliile vizuale contează, dar ele trebuie să susțină ritmul textului, nu să concureze cu el.",
  },
  {
    authorEmail: "mara@blog.local",
    title: "Ce înseamnă un editor pregătit pentru traduceri",
    slug: "editor-pregatit-pentru-traduceri",
    category: "product" as const,
    status: "published" as const,
    excerpt: "Conținutul multilingv începe cu un model de date clar și continuă cu o interfață atentă.",
    readTime: "7 min",
    content: "Traducerile nu sunt câmpuri secundare ascunse într-un formular. Ele au nevoie de identificatori, slug-uri și stări proprii, dar trebuie să rămână legate de aceeași postare editorială.",
  },
  {
    authorEmail: "andrei@blog.local",
    title: "Cum măsurăm sănătatea unui blog",
    slug: "cum-masuram-sanatatea-unui-blog",
    category: "publishing" as const,
    status: "published" as const,
    excerpt: "Câteva semnale simple pot arăta dacă un blog își ajută cu adevărat cititorii.",
    readTime: "5 min",
    content: "Numărul de postări nu spune singur povestea. Revenirea cititorilor, timpul petrecut în articole și căile de navigare arată dacă arhiva devine mai folositoare.",
  },
  {
    authorEmail: "ioana@blog.local",
    title: "De ce titlurile bune au nevoie de răbdare",
    slug: "de-ce-titlurile-bune-au-nevoie-de-rabdare",
    category: "essays" as const,
    status: "published" as const,
    excerpt: "Un titlu bun nu rezumă totul, ci deschide suficient spațiu pentru curiozitate.",
    readTime: "4 min",
    content: "Titlul este prima promisiune a unui articol. El trebuie să fie precis fără să fie închis, astfel încât cititorul să știe ce primește și să vrea să afle mai mult.",
  },
  {
    authorEmail: "sofia@blog.local",
    title: "Micile detalii care fac un dashboard folositor",
    slug: "detalii-dashboard-folositor",
    category: "product" as const,
    status: "published" as const,
    excerpt: "Stările clare, acțiunile apropiate și feedbackul rapid transformă un dashboard într-un instrument.",
    readTime: "6 min",
    content: "Un dashboard bun răspunde repede la întrebări practice: ce este nou, ce trebuie făcut și ce s-a schimbat. Restul poate rămâne în plan secund.",
  },
  {
    authorEmail: "mara@blog.local",
    title: "Cum pregătim un articol pentru mobil",
    slug: "cum-pregatim-un-articol-pentru-mobil",
    category: "design" as const,
    status: "published" as const,
    excerpt: "Cititul pe ecrane mici cere ritm, contrast și controale care nu intră în calea textului.",
    readTime: "5 min",
    content: "Pe mobil, fiecare margine și fiecare întrerupere se simte mai puternic. Un articol bun păstrează ierarhia, imaginile și acțiunile ușor de înțeles la orice lățime.",
  },
  {
    authorEmail: "andrei@blog.local",
    title: "Când merită să păstrăm un draft",
    slug: "cand-merita-sa-pastram-un-draft",
    category: "publishing" as const,
    status: "published" as const,
    excerpt: "Drafturile păstrează idei valoroase și fac loc unui proces editorial mai calm.",
    readTime: "3 min",
    content: "Un draft nu este un eșec al publicării. Este o stare utilă care păstrează munca aproape, fără să o expună înainte ca ideea să fie pregătită.",
  },
  {
    authorEmail: "ioana@blog.local",
    title: "O metodă simplă pentru postări mai clare",
    slug: "metoda-pentru-postari-mai-clare",
    category: "essays" as const,
    status: "published" as const,
    excerpt: "Structura simplă îi permite cititorului să urmărească ideea fără efort inutil.",
    readTime: "4 min",
    content: "Înainte de stil, verifică firul principal. O introducere clară, câteva idei bine separate și o încheiere care lasă loc de continuare sunt adesea suficiente.",
  },
  {
    authorEmail: "sofia@blog.local",
    title: "Cum folosim imaginile fără să pierdem ideea",
    slug: "imagini-fara-sa-pierdem-ideea",
    category: "design" as const,
    status: "published" as const,
    excerpt: "Imaginile bune completează un articol și lasă loc conținutului să conducă experiența.",
    readTime: "5 min",
    content: "O imagine editorială trebuie să dea tonul, nu să acopere ideea. Când alegerea ei este legată de subiect și de ritmul paginii, cititorul intră mai ușor în poveste.",
  },
  {
    authorEmail: "mara@blog.local",
    title: "Un ritm sănătos pentru publicarea săptămânală",
    slug: "ritm-sanatos-publicare-saptamanala",
    category: "publishing" as const,
    status: "published" as const,
    excerpt: "Un ritm realist de publicare protejează calitatea și energia autorilor pe termen lung.",
    readTime: "6 min",
    content: "Consecvența nu înseamnă să publici cu orice preț. Un calendar bun lasă timp pentru scris, revizie și conversația care apare după publicare.",
  },
];

const allDemoPosts = [...demoPosts, ...additionalPosts];

const legacyPostSlugs = [
  "welcome-to-the-blog-api",
  "fastify-drizzle-setup",
  "search-and-pagination",
];

const englishTranslations: Record<
  string,
  {
    title: string;
    slug: string;
    excerpt: string;
    readTime: string;
    content: string;
  }
> = {
  "interfete-calme-pentru-autori": {
    title: "How quiet interfaces help writers stay inside the work",
    slug: "quiet-interfaces-for-writers",
    excerpt:
      "A practical look at dashboards, margins, focus states, and tiny UI decisions that make an editorial tool feel calm.",
    readTime: "6 min",
    content:
      "A good blog does not feel like a crowded page. It feels like a place where the reader can move into the text quickly. Space, clear hierarchy, and calm imagery reduce noise before the first paragraph asks for attention.\n\nLabels, read time, and hover states are not decoration. They signal what kind of piece comes next, how much energy it asks for, and where the reader can go after finishing.\n\nA content interface needs simple rules that still work with long titles, missing images, or translated text. When the system survives those cases, the site feels crafted instead of improvised.",
  },
  "mic-sistem-editorial": {
    title: "The small editorial system behind a blog that feels alive",
    slug: "small-editorial-system",
    excerpt:
      "Categories, cadence, featured stories, and the rhythm that keeps a homepage useful without turning it into a plain feed.",
    readTime: "8 min",
    content:
      "Publishing is not putting everything on the screen. It is choosing what opens the conversation, what deserves emphasis, and what can stay in the archive until the reader is looking for exactly that thing.\n\nA blog that feels alive has recurring landmarks: predictable categories, series, newsletters, and recognizable authors. Those landmarks create trust even when posts arrive at different intervals.\n\nFilters, search, and popular lists turn a pile of articles into a navigable space. Readers do not feel like they are digging for value; they feel the site showing them possible paths.",
  },
  "arhiva-personala": {
    title: "Notes on building a personal archive people return to",
    slug: "personal-archive",
    excerpt:
      "A blog can be more than recency. Treat it like a map, and readers will know where to begin and what to save.",
    readTime: "5 min",
    content:
      "Good essays live longer when they sit inside a structure that lets them be found. A personal archive should preserve relationships between ideas, not just a cold chronology.\n\nAn older article can be the best answer for a new reader. That is why a homepage needs areas that combine freshness with editorial recommendation.\n\nA memorable blog does not win through volume alone. It wins through voice. Titles, descriptions, and groupings should sound like an attentive person, not an inventory.",
  },
  "frictiune-dashboard-autor": {
    title: "Why every author dashboard needs friction in the right places",
    slug: "author-dashboard-friction",
    excerpt:
      "Autosave, previews, destructive actions, and small confirmation patterns that protect creative work.",
    readTime: "7 min",
    content:
      "In a publishing tool, not every extra step is a problem. Some confirmations, previews, and limits help authors avoid mistakes that would cost time or trust.\n\nPost status, editing progress, and change history should be easy to scan. When data sits close to action, decisions become faster.\n\nA good dashboard supports writing without moving to the foreground. It offers control when needed and quiet when the author needs to stay inside the text.",
  },
  "dark-mode-citibil": {
    title: "A field guide to readable dark mode for long-form sites",
    slug: "readable-dark-mode",
    excerpt:
      "Dark themes work best with layered surfaces, soft text, and restraint instead of pure black drama.",
    readTime: "4 min",
    content:
      "Dark mode for long-form text needs tempered contrast. Pure black and aggressive white become tiring quickly, especially when readers spend time inside an article.\n\nVisual layers help a lot: background, surface, card, accent. When each level has a clear role, the interface stays readable without feeling heavy.\n\nA blog with good dark mode does more than swap colors. It adjusts shadows, borders, accents, and imagery so the experience remains coherent.",
  },
  "homepage-care-alege": {
    title: "The case for a homepage that chooses instead of listing",
    slug: "homepage-that-chooses",
    excerpt:
      "Readers do not need everything at once. They need a strong entry point, fresh work, and clear ways to explore.",
    readTime: "6 min",
    content:
      "An editorial homepage needs to make a clear promise. The reader should quickly understand what kind of writing lives here, which article leads, and where to continue.\n\nLong lists can be useful, but they should not be the first impression. A good selection gives direction and lets the rest of the archive be discovered through search, categories, and recommendations.\n\nWhen the page chooses for the reader, the site gains personality. It does not become more restrictive; it becomes easier to move through.",
  },
  "schita-imagini-pentru-articole": {
    title: "Draft: how we choose images for articles",
    slug: "draft-article-images",
    excerpt:
      "An internal draft about visual rules for covers, fallbacks, and images uploaded by authors.",
    readTime: "3 min",
    content:
      "This post is intentionally left as a draft. It should appear in management, but not on the homepage and not as a public article page.\n\nWhen image upload arrives, every article will be able to have its own cover, while the current logo remains the editorial fallback.",
  },
  "arhivat-layout-uri-blog": {
    title: "Archived: old notes about blog layouts",
    slug: "archived-blog-layout-notes",
    excerpt:
      "A material kept for history, but removed from the public publishing flow of the blog.",
    readTime: "2 min",
    content:
      "This post is archived. It remains visible in management for editorial context, but it does not appear in the public list of posts.\n\nThe archived status helps us preserve content without deleting it permanently.",
  },
};

const additionalEnglishTranslations = Object.fromEntries(
  [
    ["fluxuri-editoriale-fara-zgomot", "Editorial flows without noise"],
    ["ghid-pentru-arhive-explorabile", "A guide to explorable archives"],
    ["design-pagina-articol-memorabila", "Designing a memorable article page"],
    ["editor-pregatit-pentru-traduceri", "Building an editor ready for translations"],
    ["cum-masuram-sanatatea-unui-blog", "How to measure a blog's health"],
    ["de-ce-titlurile-bune-au-nevoie-de-rabdare", "Why good headlines need patience"],
    ["detalii-dashboard-folositor", "Small details that make a dashboard useful"],
    ["cum-pregatim-un-articol-pentru-mobil", "Preparing an article for mobile"],
    ["cand-merita-sa-pastram-un-draft", "When a draft is worth keeping"],
    ["metoda-pentru-postari-mai-clare", "A simple method for clearer posts"],
    ["imagini-fara-sa-pierdem-ideea", "Using images without losing the idea"],
    ["ritm-sanatos-publicare-saptamanala", "A healthy rhythm for weekly publishing"],
  ].map(([slug, title]) => [
    slug,
    {
      title,
      slug: `${slug}-en`,
      excerpt: "A practical note about building a thoughtful editorial blog.",
      readTime: "5 min",
      content:
        "This is an English version of the article, written for readers who prefer the English language. It keeps the same editorial subject while offering a complete translated reading experience.",
    },
  ]),
);

const run = async () => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, {
    schema: { users, posts, categories, languages, postTranslations },
  });

  try {
    let user = await db.query.users.findFirst({
      where: eq(users.email, demoUser.email),
    });

    if (!user) {
      const passwordHash = await hashPassword(demoUser.password);
      const [created] = await db
        .insert(users)
        .values({
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          passwordHash,
        })
        .returning();

      user = created;
      console.log(`Seed: created user ${user.email} (id=${user.id})`);
    } else {
      if (user.role !== demoUser.role) {
        const [updated] = await db
          .update(users)
          .set({ role: demoUser.role })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }

      console.log(`Seed: user exists ${user.email} (id=${user.id})`);
    }

    const authorMap = new Map<string, typeof user>();
    for (const author of authorUsers) {
      let authorUser = await db.query.users.findFirst({
        where: eq(users.email, author.email),
      });

      if (!authorUser) {
        const passwordHash = await hashPassword(author.password);
        const [created] = await db
          .insert(users)
          .values({
            email: author.email,
            name: author.name,
            role: author.role,
            passwordHash,
          })
          .returning();

        authorUser = created;
        console.log(`Seed: created author ${author.email} (id=${created.id})`);
      }

      authorMap.set(author.email, authorUser);
    }

    const languageMap = new Map<string, typeof languages.$inferSelect>();
    for (const language of seedLanguages) {
      const [savedLanguage] = await db
        .insert(languages)
        .values(language)
        .onConflictDoUpdate({
          target: languages.code,
          set: {
            name: language.name,
            nativeName: language.nativeName,
            isDefault: language.isDefault,
            isActive: language.isActive,
          },
        })
        .returning();

      languageMap.set(savedLanguage.code, savedLanguage);
    }

    const categoryMap = new Map<string, typeof categories.$inferSelect>();
    for (const category of seedCategories) {
      const [savedCategory] = await db
        .insert(categories)
        .values(category)
        .onConflictDoUpdate({
          target: categories.code,
          set: {
            name: category.name,
            nativeName: category.nativeName,
            isActive: true,
          },
        })
        .returning();
      categoryMap.set(savedCategory.code, savedCategory);
    }

    let createdCount = 0;
    let updatedCount = 0;

    await db.delete(posts).where(inArray(posts.slug, legacyPostSlugs));

    for (const post of allDemoPosts) {
      const author = authorMap.get(post.authorEmail) ?? user;
      const category = categoryMap.get(post.category);
      if (!category) {
        throw new Error(`Missing category ${post.category}`);
      }
      const existing = await db.query.posts.findFirst({
        where: and(eq(posts.slug, post.slug), eq(posts.authorId, author.id)),
        columns: { id: true },
      });
      let postId = existing?.id;

      if (existing) {
        await db
          .update(posts)
          .set({
            title: post.title,
            excerpt: post.excerpt,
            category: post.category,
            status: post.status,
            readTime: post.readTime,
            content: post.content,
            categoryId: category.id,
            publishedAt: post.status === "published" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, existing.id));
        updatedCount += 1;
      } else {
        const [createdPost] = await db
          .insert(posts)
          .values({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            category: post.category,
            status: post.status,
            readTime: post.readTime,
            content: post.content,
            publishedAt: post.status === "published" ? new Date() : null,
            authorId: author.id,
            categoryId: category.id,
          })
          .returning({ id: posts.id });

        postId = createdPost.id;
        createdCount += 1;
      }

      const roLanguage = languageMap.get("ro");
      const enLanguage = languageMap.get("en");
      const english =
        englishTranslations[post.slug] ?? additionalEnglishTranslations[post.slug];

      if (postId && roLanguage) {
        await db
          .insert(postTranslations)
          .values({
            postId,
            languageId: roLanguage.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            readTime: post.readTime,
            content: post.content,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              postTranslations.postId,
              postTranslations.languageId,
            ],
            set: {
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt,
              readTime: post.readTime,
              content: post.content,
              updatedAt: new Date(),
            },
          });
      }

      if (postId && enLanguage && english) {
        await db
          .insert(postTranslations)
          .values({
            postId,
            languageId: enLanguage.id,
            title: english.title,
            slug: english.slug,
            excerpt: english.excerpt,
            readTime: english.readTime,
            content: english.content,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              postTranslations.postId,
              postTranslations.languageId,
            ],
            set: {
              title: english.title,
              slug: english.slug,
              excerpt: english.excerpt,
              readTime: english.readTime,
              content: english.content,
              updatedAt: new Date(),
            },
          });
      }
    }

    console.log(
      `Seed: posts created=${createdCount}, updated=${updatedCount}, total template posts=${allDemoPosts.length}`,
    );
    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
