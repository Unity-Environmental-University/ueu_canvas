import assert from "assert";
import {IUserData} from "./canvasDataDefs";
import {parentElement} from "./canvasUtils";

import {Course} from "./course/Course";
import {Account} from "@/Account";
import {getSingleCourse} from "@/course/toolbox";
import {Page} from "@/content/pages/Page";

import {IProfile, IProfileWithUser} from "@/types";
import {getInstance} from "@/instance";


/** Thrown when the active Canvas instance has no faculty bios course. */
export class FacultyBiosCourseNotFoundError extends Error {
    constructor(courseName: string, baseUrl: string) {
        super(`No "${courseName}" course found on ${baseUrl}`);
        this.name = "FacultyBiosCourseNotFoundError";
    }
}

/* keyed by instance so switching instances never returns another instance's course */
const facultyCourseCache = new Map<string, Course>();

async function getFacultyCourse() {
    const {baseUrl, facultyBiosCourseName} = getInstance();
    const key = `${baseUrl}|${facultyBiosCourseName}`;
    let facultyCourse = facultyCourseCache.get(key);
    if (!facultyCourse) {
        facultyCourse = await getSingleCourse(facultyBiosCourseName, (await Account.getAll()).map(a => a.id));
        if (!facultyCourse) throw new FacultyBiosCourseNotFoundError(facultyBiosCourseName, baseUrl);
        facultyCourseCache.set(key, facultyCourse);
    }
    return facultyCourse;
}

export async function getFacultyPages(searchTerm: string) {
    const facultyCourse = await getFacultyCourse();
    return await facultyCourse.getPages({
        queryParams: {
            include: ['body'],
            search_term: searchTerm
        }
    })
}

async function getPotentialFacultyProfiles(user:IUserData) {
    let pages: Page[] = [];
    const [lastName, firstName] = user.name.split(' ')
    for(const query of [
        user.name,
        lastName,
        firstName,
    ]) {
        console.log(query);
        pages = await getFacultyPages(query);
        if(pages.length > 0) break;
    }

    const profiles = pages.map((page) => getProfileFromPage(page, user), true)

    if(profiles.length > 0) {
        for(const profile of profiles) {
            profile.displayName ??= user.name;
        }
    }
    return profiles;
}

export function getProfileFromPage(page:Page, user:IUserData) {
    const profile = getProfileFromPageHtml(page.body, user);
    profile.sourcePage = page;
    return profile;
}

function getProfileFromPageHtml(html:string, user: IUserData) {
    const el = document.createElement('div')
    el.innerHTML = html;

    const displayName = getDisplayName(el);
    const body = getProfileBody(el);
    const image = getImageLink(el);

    return {
        user,
        bio: body,
        displayName,
        image,
        imageLink: image?.src,
    } as IProfileWithUser
}
function getProfileBody(el:Element) {
    const h4s = el.querySelectorAll('h4');
    // TODO: this filter doesn't do what it reads as. search() returns -1 on no match (truthy)
    // and 0 on a match at index 0 (falsy), so it passes almost every h4. In practice the bio
    // is picked by position (potentials[0]) and that works on real pages. If you change the
    // filter, check it against real bio pages first.
    const instructorHeaders = Array.from(h4s).filter((el) => {
        return el.innerHTML.search(/instructor/i)
    })
    let potentials:string[] = [];
    for(const header of instructorHeaders) {
        const potentialParent = header.parentElement;
        if(potentialParent) {
            header.remove();
            potentials.push(potentialParent.innerHTML);
        }
    }

    potentials = winnow(potentials, [
        (potential) => potential.length > 0,
    ]);

    /* just guess if we can't find anything */
    if (potentials.length > 0) {
        return potentials[0];
    }
    return null;
}

function getDisplayName(el:Element) {
    let titles = Array.from(el.querySelectorAll('strong em'));

    if (titles.length === 0) {
        const enclosedImages = Array.from(el.querySelectorAll('p img'));

        titles = enclosedImages.map((el) => parentElement(el, 'p')?.nextElementSibling)
            .filter((el) => el instanceof Element) as Element[];
    }

    if (titles.length === 0) {
        const headings = Array.from(el.querySelectorAll('p strong'));
        // TODO: same search() truthiness quirk as in getProfileBody; see the note there.
        const instructorHeaders = headings.filter(el => el.innerHTML.search(/Instructor/));
        titles = instructorHeaders.map((el) => el.previousElementSibling)
            .filter((el) => el instanceof Element) as Element[]
    }

    titles = titles.filter((title) => title.textContent && title.textContent.length > 0)
    if (titles.length > 0) return titles[0].textContent;
    return null;
}

/**
 * Finds all the image links in the content and returns the biggest.
 * @param el
 */
function getImageLink(el:Element) {
    const imgs = el.querySelectorAll('img');
    if(imgs.length === 0) return null;
    return Array.from(imgs)[1];
}

type WinnowFunc<T> = ((value:T, number?: number, array?: T[])=>boolean);
/**
 * Takes in a list of parameters and a set of filter functions. Runs filter functions until there are one or fewer elements,
 * or it runs out of filter functions. Returns post-filtered list.
 * @param originalList The list of items to run
 * @param winnowFuncs A list of filter functions, run in order
 * @param returnLastNonEmpty If true, will return the last non-empty array found if elements are winnowed to 0
 */
function winnow<T=string>(originalList: T[], winnowFuncs: WinnowFunc<T>[], returnLastNonEmpty=false) {
    let copyList = [...originalList];
    if(copyList.length === 1) return copyList; //already at 1 element
    let lastSet = [...copyList];
    for(const winnowFunc of winnowFuncs) {
        lastSet = [...copyList];
        copyList = copyList.filter(winnowFunc);
        if(copyList.length === 1) break;
    }
    if(copyList.length === 0 && returnLastNonEmpty) return lastSet;
    return copyList;
}

function getCurioPageFrontPageProfile(html:string, user?: IUserData):IProfile {
    const el = document.createElement('div');
    el.innerHTML = html;
    try {
        const header = getCurioHeader(el);
        const match = header.innerHTML.match(/Meet your instructor, ?(.*)!/i);
        const displayName = match ? match[1] : null;
        const bio = getCurioBio(el);
        const image = getCurioProfileImage(el);
        return {
            user,
            displayName,
            image,
            imageLink: image ? image.src : null,
            bio: bio?.innerHTML
       }
    } catch(e) {
        return {
            user,
            displayName: "CANNOT LOCATE PROFILE",
            bio: (e as Error).toString(),
        }
    }
}

export function frontPageBio(profile:IProfile & {user:IUserData}) {
    return profile.bio + `<p>${profile.displayName} should be contacted during the term using Canvas Inbox,
 but can be reached after and before the term via their email address: ${profile.user.email}</p>`
    
}

export function renderProfileIntoCurioFrontPage(html: string, profile: IProfile & {user:IUserData}) {
    const el = document.createElement('div');
    el.innerHTML = html;
    if(profile.displayName) {
        const header = getCurioHeader(el);
        header.innerHTML = `Meet your instructor, ${profile.displayName}!`
    }

    if(profile.bio) {
        const bio = getCurioBio(el);
        if(bio) {
            const classes = bio.classList;
            if(!classes.contains('cbt-instructor-bio')) classes.add('cbt-instructor-bio')
            bio.innerHTML = frontPageBio(profile);
        }
    }

    if(profile.image) {
        const image = getCurioProfileImage(el);
        if(image) {
            image.src = profile.image.src;
            image.alt = profile.image.alt;
        }
    } else if (profile.imageLink) {
        const image = getCurioProfileImage(el);
        if(image) {
            image.src = profile.imageLink;
        }
    }
    return el.innerHTML;
}

function getCurioHeader(el:Element) {
    let h2s = Array.from(el.querySelectorAll('h2'));
    h2s = h2s.filter((h2) => h2.innerHTML.match(/Meet your instructor/i));
    if(h2s.length <= 0) throw new Error(`Can't find bio section of front page.\n${h2s.map(a => a.innerHTML)}\n${el.innerHTML}`);
    return h2s[0];

}
function getCurioProfileDiv(el:Element) {
    const header = getCurioHeader(el);
    const sectionEl = header.nextElementSibling;
    assert(sectionEl, "Body element of bio not found on page.")
    return sectionEl;

}

function getCurioBio(el:Element) {
    const profileDiv = getCurioProfileDiv(el);
    const bio = profileDiv.querySelector('.cbt-instructor-bio');
    if(bio && bio.innerHTML) return bio;
    const div = getCurioProfileDiv(el);
    const p = div.querySelector('p');
    return p?.parentElement;


}

function getCurioProfileImage(el:Element) {
    return getCurioProfileDiv(el).querySelector('img');

}

export {
    getPotentialFacultyProfiles,
    getCurioPageFrontPageProfile,
    winnow
}