"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
exports.getMode = getMode;
exports.listModes = listModes;
const default_js_1 = require("./default.js");
const readme_js_1 = require("./readme.js");
const blog_js_1 = require("./blog.js");
const changelog_js_1 = require("./changelog.js");
const newsletter_js_1 = require("./newsletter.js");
const tutorial_js_1 = require("./tutorial.js");
const landing_js_1 = require("./landing.js");
const registry = {
    default: { name: 'default', transforms: default_js_1.defaultTransforms },
    readme: { name: 'readme', transforms: readme_js_1.readmeTransforms },
    blog: { name: 'blog', transforms: blog_js_1.blogTransforms },
    changelog: { name: 'changelog', transforms: changelog_js_1.changelogTransforms },
    newsletter: { name: 'newsletter', transforms: newsletter_js_1.newsletterTransforms },
    tutorial: { name: 'tutorial', transforms: tutorial_js_1.tutorialTransforms },
    landing: { name: 'landing', transforms: landing_js_1.landingTransforms },
};
exports.registry = registry;
function getMode(name) {
    const mode = registry[name];
    if (!mode) {
        console.warn(`Unknown mode "${name}", falling back to default`);
        return registry.default;
    }
    return mode;
}
function listModes() {
    return Object.keys(registry);
}
//# sourceMappingURL=index.js.map