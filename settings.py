import os


ROOT = os.path.dirname(__file__)

# Static folders. All of these will be copied into the output dir, and
# symlinked from the locale directories.
STATIC_FOLDERS = ['css', 'fonts', 'img', 'js']

# L10n dir
LOCALE_DIR = os.path.join(ROOT, 'locale')
if not os.path.exists(LOCALE_DIR):
    LOCALE_DIR = os.path.join(ROOT, 'locale_test')

# .lang file, filename
LANG_FILENAME = 'fhr.lang'

# List of languages.
LANGS = (
    'ach', 'af', 'ak', 'an', 'ar', 'as', 'ast', 'az', 'be', 'bg',
    'bn-BD', 'bn-IN', 'br', 'bs', 'ca', 'cs', 'csb', 'cy', 'da',
    'de', 'el', 'en-GB', 'en-US', 'eo', 'es-AR', 'es-CL', 'es-ES', 'es-MX',
    'et', 'eu', 'fa', 'ff', 'fi', 'fr', 'fy-NL', 'ga-IE', 'gd', 'gl',
    'gu-IN', 'he', 'hi-IN', 'hr', 'hu', 'hy-AM', 'id', 'is', 'it', 'ja', 
    'ja-JP-mac', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'lg', 'lij', 'lt', 'lv', 
    'mai', 'mk', 'ml', 'mn', 'mr', 'my', 'nb-NO', 'nl', 'nn-NO', 'nso', 'oc', 'or',
    'pa-IN', 'pl', 'pt-BR', 'pt-PT', 'rm', 'ro', 'ru', 'sah', 'si', 'sk',
    'sl', 'son', 'sq', 'sr', 'sv-SE', 'sw', 'ta', 'ta-LK', 'te', 'th',
    'tr', 'uk', 'ur', 'vi', 'zh-CN', 'zh-TW', 'zu',
)

# RTL languages.
RTL_LANGS = ('ar', 'fa', 'he', 'ur')

# Language fallbacks. Langs listed here will be symlinked to their respective
# fallbacks rather than generated on their owns. Both sides must exist in
# LANGS.
LANG_FALLBACK = {
    'be': 'ru',
    'ja-JP-mac': 'ja',
    'mn': 'ru',
    'he': 'en-US',
}

# View to build - specify either 'passive' or 'urgent'
BUILD_VERSION = 'passive'
