"use client";

import { useEffect, useRef, useState } from "react";

import { ContactForm } from "./contact-form";

type PublicProject = {
  id: string;
  title: string;
  summary: string;
  category: string;
  year: number | null;
  coverKey: string | null;
  externalUrl: string;
};

const sectionIds = ["home", "about", "capabilities", "archive", "contact"] as const;
const navLabels = ["首页", "关于", "能力", "档案", "联系"];
const capabilities = [
  ["AI 视频制作", "从概念、脚本到画面与成片，组织完整的影像表达。"],
  ["网站开发", "把想法转化为清晰、可浏览、可交互的数字界面。"],
  ["视觉设计", "建立统一的色彩、版式与图形语言，让内容形成辨识度。"],
  ["内容策划", "梳理主题、叙事与传播节奏，让复杂信息更容易被理解。"],
  ["项目管理", "拆解目标、协调流程并控制交付质量，让创意真正落地。"],
  ["自媒体运营", "围绕长期表达规划选题、内容形态与持续发布节奏。"],
] as const;

export function PublicSite({
  projects,
  archiveUnavailable = false,
}: {
  projects: PublicProject[];
  archiveUnavailable?: boolean;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  const [activeSection, setActiveSection] = useState<(typeof sectionIds)[number]>("home");
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    document.documentElement.classList.add("has-js");
    const sections = [...root.querySelectorAll<HTMLElement>("[data-section]")];
    const revealSections = sections.filter((section) => section.classList.contains("reveal"));
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let revealObserver: IntersectionObserver | undefined;
    let spyObserver: IntersectionObserver | undefined;

    if (reducedMotion) {
      revealSections.forEach((section) => section.classList.add("is-visible"));
    } else if (typeof IntersectionObserver === "function") {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
      }, { threshold: 0.24, rootMargin: "-8% 0px -8% 0px" });
      revealSections.forEach((section) => {
        section.classList.add("is-pending");
        revealObserver?.observe(section);
      });
    }

    if (typeof IntersectionObserver === "function") {
      const visibility = new Map<Element, IntersectionObserverEntry>();
      spyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => visibility.set(entry.target, entry));
        const mostVisible = [...visibility.values()]
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible && sectionIds.includes(mostVisible.target.id as (typeof sectionIds)[number])) {
          setActiveSection(mostVisible.target.id as (typeof sectionIds)[number]);
        }
      }, { threshold: [0.25, 0.5, 0.75] });
      sections.forEach((section) => spyObserver?.observe(section));
    }

    if (avatarRef.current?.complete && avatarRef.current.naturalWidth === 0) setAvatarFailed(true);
    return () => {
      revealObserver?.disconnect();
      spyObserver?.disconnect();
      document.documentElement.classList.remove("has-js");
    };
  }, []);

  return (
    <>
      <header className="site-header" aria-label="主导航">
        <a className="wordmark" href="#home" aria-label="返回首页">SV<span>✦</span></a>
        <nav>
          {sectionIds.map((id, index) => <a key={id} href={`#${id}`} className={activeSection === id ? "is-active" : undefined} aria-current={activeSection === id ? "page" : undefined}>{navLabels[index]}</a>)}
        </nav>
      </header>
      <main ref={rootRef}>
        <section id="home" className="hero reveal" data-section>
          <p className="eyebrow">独立创作者 / CREATIVE GENERALIST</p>
          <h1 aria-label="StarVen">STARVEN</h1>
          <div className={`hero-visual${avatarFailed ? " avatar-missing avatar-load-failed" : ""}`}>
            <div className="avatar-fallback" aria-hidden="true"><span>SV</span></div>
            <img ref={avatarRef} id="starven-avatar" src="/assets/starven-avatar.png" alt="StarVen 的艺术化虚拟形象" onError={() => setAvatarFailed(true)} />
          </div>
          <p className="hero-line">在影像、设计、技术与内容之间，建立自己的表达方式。</p>
          <a className="primary-action" href="#contact">联系 StarVen</a>
          <p className="scroll-cue" aria-hidden="true">SCROLL TO EXPLORE ↓</p>
        </section>
        <section id="about" className="statement reveal" data-section>
          <p className="section-index">01 / 关于</p><h2>我不被一种工具定义。</h2><p>从影像到界面，从视觉到内容，我把不同能力组织成完整表达。技术是方法，创意才是方向。</p>
        </section>
        <section id="capabilities" className="capabilities reveal" data-section>
          <p className="section-index">02 / 能力</p><h2>六种能力，一套创作系统。</h2>
          <div className="capability-list">{capabilities.map(([title, description], index) => <article key={title} tabIndex={0}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
        <section id="archive" className="archive reveal" data-section>
          <p className="section-index">03 / 档案</p><h2>作品正在进入档案。</h2>
          {archiveUnavailable && <p className="archive-notice" role="status">档案暂时无法读取，其他内容仍可正常浏览。</p>}
          <div className="archive-grid">
            {projects.length > 0
              ? projects.map((project, index) => (
                <article key={project.id}>
                  <a className="archive-card" href={project.externalUrl} target="_blank" rel="noreferrer">
                    <div className="archive-cover" aria-hidden="true">
                      {project.coverKey
                        ? <img src={`/api/media/${encodeURIComponent(project.coverKey)}`} alt="" />
                        : <span>SV</span>}
                    </div>
                    <div className="archive-meta">
                      <span>{project.category} / {project.year ?? "—"}</span>
                      <strong>{project.title}</strong>
                      <p>{project.summary}</p>
                      <small>ARCHIVE {String(index + 1).padStart(2, "0")} ↗</small>
                    </div>
                  </a>
                </article>
              ))
              : [1, 2, 3].map((item) => (
                <article className="archive-placeholder" key={item}>
                  <span>ARCHIVE {String(item).padStart(2, "0")}</span>
                  <strong>持续生成中</strong>
                </article>
              ))}
          </div>
        </section>
        <section id="contact" className="contact reveal" data-section>
          <p className="section-index">04 / 联系</p><h2>不被模板限制的表达，<br />可以从一句你好开始。</h2>
          <ContactForm />
          <p className="closing-mark" aria-hidden="true">STARVEN ✦</p>
        </section>
      </main>
    </>
  );
}
