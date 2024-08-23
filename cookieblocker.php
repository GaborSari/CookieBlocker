<?php

class CookieBlocker
{
    private $whitelist = [];
	
    private $debug;
	private $collect;

    public function __construct($debug = false, $collect = false)
    {
        $this->debug = $debug;
		$this->collect = $collect;
    }

    public function blockCookies($outputHtml)
    {
        $pattern = '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i';

        preg_match_all($pattern, $outputHtml, $matches);

        foreach ($matches[0] as $scriptHtml) {
            $dom = new DOMDocument;
            $dom->loadHTML($scriptHtml);
            $scriptTag = $dom->getElementsByTagName('script')->item(0);

            if ($this->isWhitelisted($scriptTag) || $scriptTag->hasAttribute('data-cookieblocker-skip') === true) {
                continue;
            }

            $this->modifyScriptType($scriptTag);
            $this->modifyScriptAttributes($scriptTag);

            // Replace the original script tag with the modified one in the HTML
            $outputHtml = str_replace($scriptHtml, $dom->saveHTML($scriptTag), $outputHtml);
        }

        return $outputHtml;
    }

    private function modifyScriptType($scriptTag)
    {
        $scriptTag->setAttribute('type', 'text/plain');
    }

    private function modifyScriptAttributes($scriptTag)
    {
        // Add 'data-category' attribute if it doesn't exist
        if (!$scriptTag->hasAttribute('data-category') && !$scriptTag->hasAttribute('data-service')) {
            $scriptTag->setAttribute('data-category', 'fallback-all');

			$scriptContent = $scriptTag->getAttribute('src') ? $scriptTag->getAttribute('src') : $scriptTag->textContent;
            if ($this->collect) {
				$collection = fopen("cookieBlocker.log", "a") or die("Unable to open file!");
				$txt = date('Y-m-d H:i:s').' '.$_SERVER['REQUEST_URI'].': '.$scriptContent;
				fwrite($collection, "\n". $txt);
				fclose($collection);
            }
            if ($this->debug) {
                echo('nonset: <pre>' . $scriptContent . '</pre><br>');
            }
        }
    }

    private function isWhitelisted($scriptTag)
    {
        $src = $scriptTag->getAttribute('src');
        $isWhitelisted = false;

        if ($src) {
            $p = strpos($src, '?');
            if ($p !== false) {
                // Extract the substring up to the position of the '?'
                $src = substr($src, 0, $p);
            }
            foreach ($this->whitelist as $whitelistEntry) {
                if (@preg_match($whitelistEntry, '') === false) {
                    if ($whitelistEntry === $src) {
                        $isWhitelisted = true;
                        break;
                    }
                } else {
                    if (preg_match($whitelistEntry, $src)) {
                        $isWhitelisted = true;
                        break;
                    }
                }
            }
        }

        return $isWhitelisted;
    }
}

// Usage example
/**
 * 
 * $debug = 1; // or any debug level you prefer
 * $cookieBlocker = new CookieBlocker($debug);
 * $outputHtml = '<!-- Your HTML content -->';
 * $modifiedHtml = $cookieBlocker->blockCookies($outputHtml);
 * 
 * 
 */
