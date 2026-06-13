import { defaultTransforms } from './default.js';
import { readmeTransforms } from './readme.js';
import { blogTransforms } from './blog.js';
import { changelogTransforms } from './changelog.js';
import { newsletterTransforms } from './newsletter.js';
import { tutorialTransforms } from './tutorial.js';
import { landingTransforms } from './landing.js';
const registry = {
    default: { name: 'default', transforms: defaultTransforms },
    readme: { name: 'readme', transforms: readmeTransforms },
    blog: { name: 'blog', transforms: blogTransforms },
    changelog: { name: 'changelog', transforms: changelogTransforms },
    newsletter: { name: 'newsletter', transforms: newsletterTransforms },
    tutorial: { name: 'tutorial', transforms: tutorialTransforms },
    landing: { name: 'landing', transforms: landingTransforms },
};
export function getMode(name) {
    const mode = registry[name];
    if (!mode) {
        console.warn(`Unknown mode "${name}", falling back to default`);
        return registry.default;
    }
    return mode;
}
export function listModes() {
    return Object.keys(registry);
}
export { registry };
//# sourceMappingURL=index.js.map