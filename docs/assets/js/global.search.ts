
interface MatchResult extends Page {
    type: MatchType;
    section?: Section;
    subtitle?: FragmentTitle;
    code?: string;
    text?: string;
}
interface Page {
    id: number;
    url: string;
    category: "Product" | "Email" | "Content" | "Brand" | ""
    title: string;
    description?: string;
    sections: Section[]; 
}
interface Section {
    subtitles: FragmentTitle[];
    codes: string[];
    text: string;
}
interface FragmentTitle {
    href?: string;
    text?: string
}

(async function () {
    const resp = await fetch("/search.json")
    const pages = await resp.json() as Page[];
    
    var searchbox = document.getElementById("searchbox") as HTMLInputElement
    var resultbox = document.getElementById("search-results")!

    searchbox.addEventListener("focus", function () { 
        resultbox.classList.remove("d-none")
    })
    // TODO: Also handle blur
    document.addEventListener("click", function(e) {
        // if click wasn't from search, close search
        if (!(e.target as HTMLElement).closest("#searchbox,#search-results")) {
            resultbox.classList.add("d-none")
        }
    })

    // TODO: handle focus / change events
    // TODO: debounce if needed
    searchbox.addEventListener("keyup", handleSearch)
        
    function handleSearch() {
        var searchTerm = searchbox.value.toLowerCase();

        if (!searchTerm) {
            resultbox.innerHTML = /*html*/
                `<p class="fs-body2 p8 mb0">Start typing to search</p>`;
            return
        }

        const matches = findMatches(searchTerm).slice(0,5);

        if (!matches.length) {
            resultbox.innerHTML = /*html*/
                `<p class="fs-body2 p8 mb0">Sorry, no matches were found.</p>`;
            return
        }

        // render matches
        const matchesHtml = matches.map(m => {

            const url = m.url + getUrlFragment(m, searchTerm)

            const showSubtitle = m.subtitle?.text // [MatchType.SectionTitleExactMatch, MatchType.SectionTitlePartialMatch].includes(m.type)
            const showSection = m.section // [MatchType.CodePartialMatch, MatchType.CodePartialMatch].includes(m.type)
            const sectionTitle = m.subtitle?.text || m.section?.subtitles[0]?.text || ""
            const showDescription = !showSection
            
            const html = /*html*/
                `<li><a href="${url}" class="d-block p8 h:bg-powder-050">
                    <div class="d-flex ai-center fw-wrap g4">
                        <span class="bg-powder-050 bar-md p4 px8 fc-black">${m.category}</span>
                        <span class="fs-body2">${highlightText(titleCase(m.title), searchTerm)}</span>
                        ${m.subtitle?.text ? /*html*/`<span> &gt; <span> <span class="fs-body1">${highlightText(titleCase(m.subtitle.text), searchTerm)}</span>` : ""}
                    </div>
                    ${showDescription ? getDescription(m.description, searchTerm) : ""}
                    
                    ${m.code ? /*html*/`<code class="d-inline-block my4 stacks-code" >${highlightText(m.code, searchTerm)}</code>` : ""}
                    ${m.text ? /*html*/`<div class="fc-black pl8">${highlightTextSnippet(m.text, searchTerm)}</div>` : ""}
                </a></li>`;
            return html
        })
        resultbox.innerHTML = /*html*/
            `<ul class="list-reset g4">
                ${matchesHtml.join("")}
            </ul>`
        
    }

    function getDescription(desc: string | undefined, searchTerm: string) {
        if (!desc) return ""
        const descHtml = desc.includes(searchTerm)
            ? highlightTextSnippet(titleCase(desc), searchTerm)
            : highlightText(truncateString(titleCase(desc)), searchTerm)
            
        const output = /*html*/`<div class="fc-black pl8">${descHtml}</div>`
        return output
    }

    function truncateString(input: string, maxLen = 100): string {
        if (input.length < maxLen) return input;
        return input.slice(0, maxLen) + "..."
    }

    function highlightTextSnippet(text: string, match: string) {
        var snippet = getTextSnippet(text,match)
        return highlightText(snippet, match)
    }

    function highlightText(text: string, match: string) {
        var reg = new RegExp(match.trim(), 'gi')
        var result = text.replace(reg, "<mark class='d-inline-block bg-orange-100 fw-bold mxn1 px1'>$&</mark>")
        return result.replaceAll("...", /*html*/`<span class="fc-black-150">...</span>`);
    }

    function getTextSnippet(text: string, match: string) {
        const startPos = text.toLowerCase().indexOf(match)

        // get starting point
        var prev_counter = 0
        var prev_words = 2
        var prev_index = startPos
        for (var i = startPos - 1; i > 0; i--) {
            if (text[i] === " ") { //word
                // increment prev_counter
                prev_counter++
                prev_index = i
                if (prev_counter > prev_words) {break;}
            }
        }

        // get ending point
        var next_counter = 0
        var next_words = 8
        var next_index = startPos
        for (var i = startPos - 1; i < text.length; i++) {
            next_index = i
            if (text[i] === " ") { //word
                // increment prev_counter
                next_counter++
                if (next_counter > next_words) {break;}
            }
        }

        var snippet = text.slice(prev_index, next_index + 1)
        const prefix = prev_index > 0 ? '... ' : ""
        const suffix = next_index < text.length - 1 ? " ..." : ""
        const result = prefix + snippet + suffix
        return result
    }

    function titleCase(input: string): string {
        return input.slice(0,1).toUpperCase() + input.slice(1)
    }

    function getUrlFragment(match: MatchResult, searchTerm: string) {
        // if matched url, go to full page
        if ([MatchType.TitleExactMatch, MatchType.TitlePartialMatch].includes(match.type)) {
            return ""
        }
        // if matched subtitle, go to section
        if ([MatchType.SectionTitleExactMatch, MatchType.SectionTitlePartialMatch].includes(match.type) && match.subtitle?.href) {
            return "#" + match.subtitle.href
        }
        // fallback to text fragments - https://developer.mozilla.org/en-US/docs/Web/Text_fragments
        return `#:~:text=${searchTerm}`
    }


    function findMatches(searchTerm: string): MatchResult[] {
        const matches = new Map<number, MatchResult>();
        // title exact match
        const titleMatches = pages.filter(p => p.title === searchTerm).map(page => ({type: MatchType.TitleExactMatch, ...page}))
        pushIfNew(matches, titleMatches)
        if (matches.size > 5) [...matches.values()]

        // section title exact match
        const sectionTitleMatches = pages.flatMap(p => {
            for (const section of p.sections) {
                for (const subtitle of section.subtitles) {
                    if (subtitle.text === searchTerm) {
                        return [{
                            type: MatchType.SectionTitleExactMatch,
                            ...p,
                            section,
                            subtitle,
                        }]
                    }
                }
            }
            return [];
        })
        pushIfNew(matches, sectionTitleMatches)
        if (matches.size > 5) [...matches.values()]
        
        // title partial match
        const titlePartialMatches = pages.filter(p => p.title.includes(searchTerm)).map(page => ({type: MatchType.TitlePartialMatch, ...page}))
        pushIfNew(matches, titlePartialMatches)
        if (matches.size > 5) [...matches.values()]
        
        // description partial match
        const descPartialMatches = pages.filter(p => p.description?.includes(searchTerm)).map(page => ({type: MatchType.DescriptionPartialMatch, ...page}))
        pushIfNew(matches, descPartialMatches)
        if (matches.size > 5) [...matches.values()]
        
        // section title partial match
        const sectionTitlePartialMatches = pages.flatMap(p => {
            for (const section of p.sections) {
                for (const subtitle of section.subtitles) {
                    if (subtitle.text?.includes(searchTerm)) {
                        return [{
                            type: MatchType.SectionTitlePartialMatch,
                            ...p,
                            section,
                            subtitle,
                        }]
                    }
                }
            }
            return [];
        })
        pushIfNew(matches, sectionTitlePartialMatches)
        if (matches.size > 5) [...matches.values()]
        
        // code partial match
        const codePartialMatches = pages.flatMap(p => {
            for (const section of p.sections) {
                for (const code of section.codes) {
                    // TODO - render all matching codes
                    if (code?.includes(searchTerm)) {
                        return [{
                            type: MatchType.CodePartialMatch,
                            ...p,
                            section,
                            code,
                        }]
                    }
                }
            }
            return [];
        })
        pushIfNew(matches, codePartialMatches)
        if (matches.size > 5) [...matches.values()]
        
        // paragraph partial match
        const paragraphPartialMatches = pages.flatMap(p => {
            for (const section of p.sections) {
                if (section.text.includes(searchTerm)) {
                    return [{
                        type: MatchType.ParagraphPartialMatch,
                        ...p,
                        section,
                        text: section.text
                    }]
                }
            }
            return [];
        })
        pushIfNew(matches, paragraphPartialMatches)
        
        return [...matches.values()]
    }

    function pushIfNew(matches: Map<number, MatchResult>, incoming: MatchResult[]) {
        incoming.forEach((m) => {
            if (!matches.has(m.id)) {
                matches.set(m.id, m)
            }
        })
    }
})()

enum MatchType {
    TitleExactMatch,
    SectionTitleExactMatch,
    TitlePartialMatch,
    DescriptionPartialMatch,
    SectionTitlePartialMatch,
    CodePartialMatch,
    ParagraphPartialMatch
    // TODO Multi Term Match?
}
