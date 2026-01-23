import {CanvasData} from "@/canvasDataDefs";

export const mockCiteAsResponse = {
  "citations": [
    {
      "citation": "(n.d.). Citation - The very hungry caterpillar - UW-Madison Libraries. Retrieved from https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "style_fullname": "American Psychological Association 6th edition",
      "style_shortname": "apa"
    },
    {
      "citation": "Anon, Citation - The very hungry caterpillar - UW-Madison Libraries. Available at: https://search.library.wisc.edu/catalog/9910611455202121/cite.",
      "style_fullname": "Harvard Reference format 1 (author-date)",
      "style_shortname": "harvard1"
    },
    {
      "citation": "1.Citation - The very hungry caterpillar - UW-Madison Libraries.",
      "style_fullname": "Nature",
      "style_shortname": "nature"
    },
    {
      "citation": "“Citation - the Very Hungry Caterpillar - Uw-madison Libraries”. “Citation - the Very Hungry Caterpillar - Uw-madison Libraries”. Web. \u003Chttps://search.library.wisc.edu/catalog/9910611455202121/cite\u003E...",
      "style_fullname": "Modern Language Association 7th edition (with URL)",
      "style_shortname": "modern-language-association-with-url"
    },
    {
      "citation": "“Citation - the Very Hungry Caterpillar - Uw-madison Libraries”. n.d.. “Citation - the Very Hungry Caterpillar - Uw-madison Libraries”. https://search.library.wisc.edu/catalog/9910611455202121/cite.",
      "style_fullname": "Chicago Manual of Style 16th edition (author-date)",
      "style_shortname": "chicago-author-date"
    },
    {
      "citation": "1. Citation - The very hungry caterpillar - UW-Madison Libraries [Internet]. Available from: https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "style_fullname": "Vancouver",
      "style_shortname": "vancouver"
    }
  ],
  "exports": [
    {
      "export": "type,title,URL,id\nmisc,Citation - The very hungry caterpillar - UW-Madison Libraries,https://search.library.wisc.edu/catalog/9910611455202121/cite,ITEM-1",
      "export_name": "csv"
    },
    {
      "export": "%T Citation - The very hungry caterpillar - UW-Madison Libraries\n%J \n%V \n%N \n%P \n%D \n%I \n0% Journal Article",
      "export_name": "enw"
    },
    {
      "export": "TY - JOUR\nT1 - Citation - The very hungry caterpillar - UW-Madison Libraries\nJO - \nVL - \nIS - \nSP - \nV1 - \nPB - \nER - ",
      "export_name": "ris"
    },
    {
      "export": "@misc{ITEM1, title={Citation - The very hungry caterpillar - UW-Madison Libraries},\njournal={},\nvolume={},\nnumber={},\npages={},\nyear={},\npublisher={},\nauthor={}}",
      "export_name": "bibtex"
    }
  ],
  "metadata": {
    "URL": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
    "id": "ITEM-1",
    "title": "Citation - The very hungry caterpillar - UW-Madison Libraries",
    "type": "misc"
  },
  "name": "Citation - The very hungry caterpillar - UW-Madison Libraries",
  "provenance": [
    {
      "additional_content_url": null,
      "content_url": "the hungry hungry caterpillar",
      "found_via_proxy_type": null,
      "has_content": true,
      "host": null,
      "key_word": "the hungry hungry caterpillar",
      "name": "UserInputStep",
      "original_url": null,
      "parent_step_name": "NoneType",
      "parent_subject": null,
      "source_preview": {
        "title": null
      },
      "subject": "user input"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": "google",
      "has_content": true,
      "host": null,
      "key_word": null,
      "name": "GoogleStep",
      "original_url": null,
      "parent_step_name": "UserInputStep",
      "parent_subject": "user input",
      "source_preview": {
        "title": null
      },
      "subject": "google search result"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "arXiv ID",
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "ArxivResponseStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "ArXiv page"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": "github",
      "key_word": null,
      "name": "GithubRepoStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "GitHub repository main page"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "BitbucketRepoStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "Bitbucket repository main page"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": "cran",
      "key_word": null,
      "name": "CranLibraryStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "R CRAN package webpage"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": "pypi",
      "key_word": null,
      "name": "PypiLibraryStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "Python PyPI package webpage"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": "link",
      "has_content": true,
      "host": "webpage",
      "key_word": null,
      "name": "WebpageStep",
      "original_url": null,
      "parent_step_name": "GoogleStep",
      "parent_subject": "google search result",
      "source_preview": {
        "title": null
      },
      "subject": "webpage"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "RelationHeaderStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "cite-as relation header"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "doi",
      "has_content": false,
      "host": "crossref",
      "key_word": null,
      "name": "CrossrefResponseStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "DOI API response"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": "pmid or pmcid",
      "has_content": false,
      "host": "pmid or pmcid",
      "key_word": null,
      "name": "PMIDStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "PubMed identifier"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "arXiv ID",
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "ArxivResponseStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "ArXiv page"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": "github",
      "key_word": null,
      "name": "GithubRepoStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "GitHub repository main page"
    },
    {
      "additional_content_url": null,
      "content_url": null,
      "found_via_proxy_type": "link",
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "BitbucketRepoStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "Bitbucket repository main page"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": null,
      "has_content": false,
      "host": null,
      "key_word": null,
      "name": "BibtexStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": null
      },
      "subject": "BibTeX"
    },
    {
      "additional_content_url": null,
      "content_url": "https://search.library.wisc.edu/catalog/9910611455202121/cite",
      "found_via_proxy_type": null,
      "has_content": true,
      "host": "webpage",
      "key_word": null,
      "name": "WebpageMetadataStep",
      "original_url": null,
      "parent_step_name": "WebpageStep",
      "parent_subject": "webpage",
      "source_preview": {
        "title": "\u003Ci\u003ESnapshot of title data found at https://search.library.wisc.edu/catalog/9910611455202121/cite.\u003C/i\u003E\u003Cbr\u003E;&gt; \t&lt;link rel=&quot;stylesheet&quot; href=&quot;https://fonts.googleapis.com/icon?family=Material+Icons&quot;&gt; \t&lt;link rel=&quot;stylesheet&quot; href=&quot;https://use.typekit.net/dwu5mei.css&quot;&gt; \t&lt;link rel=&quot;stylesheet&quot; crossorigin href=&quot;https://cdn.wisc.cloud/fonts/uw-rh/fonts-woff2.0.0.1.css&quot;&gt; \t&lt;link rel=&quot;stylesheet&quot; crossorigin href=&quot;https://cdn.wisc.cloud/fonts/languages/0.0.1/uw-language-font-files.css&quot;&gt; \t \t\t&lt;title&gt;\u003Cspan class=\"highlight\"\u003ECitation - The very hungry caterpillar - UW-Madison Libraries\u003C/span\u003E&lt;/title&gt; \t&lt;link rel=&quot;stylesheet&quot; media=&quot;all&quot; href=&quot;/assets/application-3d7855b0bde27e1916896e2fd9fb0a674994158303dbb2a75a5672d5434e9449.css&quot; /&gt; \t&lt;script src=&quot;https://web.lib.wisc.edu/globaljs/global-2.0.2.min.js&quot;&gt;&lt;/script&gt; \t&lt;script src=&quot;https://cdn.wisc.cloud/cookie-consent/uwcookieconsent.min.js&quot;&gt;&lt;/script&gt; \t&lt;script src=&quot;/assets/application-2d"
      },
      "subject": "webpage"
    }
  ],
  "url": "the hungry hungry caterpillar"
};

export default mockCiteAsResponse;