<?php





/**
 * Dequeue Foxiz CSS early.
 */
function wd4_kill_foxiz_css() {
    // Common Foxiz stylesheet handles
    $foxiz_handles = array(
        'foxiz-main-css',
        'foxiz-main',
        'foxiz-style',  // sometimes used as alias
        'foxiz-global', // optional, some setups use this
    );

    foreach ( $foxiz_handles as $h ) {
        wp_dequeue_style( $h );
        wp_deregister_style( $h );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_kill_foxiz_css', 1000 ); // run very late to beat the theme

// Optional: set your front-end login page ID
if ( ! defined( 'WD_LOGIN_PAGE_ID' ) ) {
    define( 'WD_LOGIN_PAGE_ID', 0 ); // put your /login-3/ page ID here (optional but safer)
}

function wd4_is_front_login_page(): bool {
    if ( WD_LOGIN_PAGE_ID ) {
        return is_page( WD_LOGIN_PAGE_ID );
    }
    return is_page( 'login-3' );
}

/**
 * Enqueue your custom styles where needed.
 */
function wd4_enqueue_styles() {
    $is_login   = wd4_is_front_login_page();
    $is_account = function_exists( 'is_account_page' ) && is_account_page();

    // Home
    if ( is_front_page() || is_home() ) {
        wp_enqueue_style( 'main',    'https://aistudynow.com/wp-content/themes/css/header/main.css',   array(), '7565677766876655777999980.0' );
        wp_enqueue_style( 'slider',  'https://aistudynow.com/wp-content/themes/css/header/slider.css', array(), '6678576655777999980.0' );
        wp_enqueue_style( 'social',  'https://aistudynow.com/wp-content/themes/css/header/social.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'divider', 'https://aistudynow.com/wp-content/themes/css/header/divider.css',array(), '66997876655777999980.0' );
        wp_enqueue_style( 'grid',    'https://aistudynow.com/wp-content/themes/css/header/grid.css',   array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',  'https://aistudynow.com/wp-content/themes/css/header/footer.css', array(), '667876655777999980.0' );
    }

    // Category
    if ( is_category() ) {
        wp_enqueue_style( 'main',      'https://aistudynow.com/wp-content/themes/css/header/main.css',      array(), '7667876655777999980.0' );
        wp_enqueue_style( 'catheader', 'https://aistudynow.com/wp-content/themes/css/header/catheader.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',      'https://aistudynow.com/wp-content/themes/css/header/grid.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',    'https://aistudynow.com/wp-content/themes/css/header/footer.css',    array(), '667876655777999980.0' );
    }

    // Single posts
    if ( is_singular( 'post' ) ) {
        wp_enqueue_style( 'main',       'https://aistudynow.com/wp-content/themes/css/header/main.css',                array(), '77779999880.0' );
        wp_enqueue_style( 'single',     'https://aistudynow.com/wp-content/themes/css/header/single/single.css',       array(), '8667876655777999980.0' );
        wp_enqueue_style( 'sidebar',    'https://aistudynow.com/wp-content/themes/css/header/single/sidebar.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'email',      'https://aistudynow.com/wp-content/themes/css/header/single/email.css',        array(), '667876655777999980.0' );
        wp_enqueue_style( 'download',   'https://aistudynow.com/wp-content/themes/css/header/single/download.css',     array(), '667876655777999980.0' );
        wp_enqueue_style( 'sharesingle','https://aistudynow.com/wp-content/themes/css/header/single/sharesingle.css',  array(), '667876655777999980.0' );
        wp_enqueue_style( 'related',    'https://aistudynow.com/wp-content/themes/css/header/single/related.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'author',     'https://aistudynow.com/wp-content/themes/css/header/single/author.css',       array(), '667876655777999980.0' );
        wp_enqueue_style( 'comment',    'https://aistudynow.com/wp-content/themes/css/header/single/comment.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',       'https://aistudynow.com/wp-content/themes/css/header/grid.css',                array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',     'https://aistudynow.com/wp-content/themes/css/header/footer.css',              array(), '667876655777999980.0' );
    }

    // Front-end login page
    if ( $is_login ) {
        wp_enqueue_style( 'login', 'https://aistudynow.com/wp-content/themes/css/login.css', array(), '974777977.2.0' );
    }

    // Search results
    if ( is_search() ) {
        wp_enqueue_style( 'main',         'https://aistudynow.com/wp-content/themes/css/header/main.css',        array(), '667876655777999980.0' );
        wp_enqueue_style( 'searchheader', 'https://aistudynow.com/wp-content/themes/css/header/searchheader.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',         'https://aistudynow.com/wp-content/themes/css/header/grid.css',         array(), '667876655777999980.0' );
        wp_enqueue_style( 'fixgrid',      'https://aistudynow.com/wp-content/themes/css/header/fixgrid.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',       'https://aistudynow.com/wp-content/themes/css/header/footer.css',       array(), '667876655777999980.0' );
    }

    // Woo My Account
    if ( $is_account ) {
        wp_enqueue_style( 'my-account', 'https://aistudynow.com/wp-content/themes/css/profile.css', array(), '1.80.0' );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_enqueue_styles', 20 );

/**
 * PRUNE AGGRESSIVELY ONLY on: home, category, single posts.
 * Do NOT prune on login or search pages (prevents click/overlay breakage).
 */
function wd4_prune_styles() {
    if ( is_admin() ) {
        return;
    }

    $is_login  = wd4_is_front_login_page();
    $is_search = is_search();

    // Skip pruning on login & search to avoid breaking interactivity and layout
    if ( $is_login || $is_search ) {
        return;
    }

    // Prune only on these targets:
    $is_target = ( is_front_page() || is_home() || is_category() || is_singular( 'post' ) );
    if ( ! $is_target ) {
        return;
    }

    global $wp_styles;
    if ( ! ( isset( $wp_styles ) && $wp_styles instanceof WP_Styles ) ) {
        return;
    }

    // Allow-list: include your custom handles + some safe core/theme ones
    $allowed = array(
        // your custom
        'main','cat','login','search','single',
        'slider','pro-crusal','fixgrid','crusal','searchheader','front',
        'login2','header-mobile','profile','search-mobile','menu-mobile','sidebar-mobile',
        'divider','footer','grid','social','catheader','sidebar','related','email','download','sharesingle','author','comment',

        // core/safe
        'dashicons',

        // If your theme main stylesheet has a specific handle, add it here (examples):
        'style','theme-style','foxiz-style',
    );

    if ( is_user_logged_in() ) {
        $allowed[] = 'admin-bar';
    }

    foreach ( (array) $wp_styles->queue as $handle ) {
        if ( ! in_array( $handle, $allowed, true ) ) {
            wp_dequeue_style( $handle );
            wp_deregister_style( $handle );
        }
    }
}
add_action( 'wp_print_styles', 'wd4_prune_styles', PHP_INT_MAX );

/** Also load on core login screen (wp-login.php) */
add_action( 'login_enqueue_scripts', function () {
    wp_enqueue_style( 'login', 'https://aistudynow.com/wp-content/themes/css/login.css', array(), '97488777977.2.0' );
} );








/**
 * Dynamically insert up to FOUR in-article AdSense units based on paragraph count.
 * Loader must already be in <head>.
 * - ≤4 paras   => 1 ad  after p2
 * - 5–7 paras  => 2 ads after p2, p5
 * - 8–12 paras => 3 ads after p2, p5, p9
 * - ≥13 paras  => 4 ads after p2, p5, p9, p12
 * All positions are capped to the last-1 paragraph (never after final </p>).
 */

/** Your in-article slot IDs (in order) */
if ( ! defined( 'ASN_INARTICLE_SLOTS' ) ) {
	define( 'ASN_INARTICLE_SLOTS', json_encode( array(
		'1012646722', // #1
		'6169550738', // #2
		'2230305722', // #3
		'2481641061', // #4 (NEW for ≥13 paragraphs)
	)));
}

/** Build one in-article ad wrapper (unique id + slot) */
function asn_build_inarticle_ad( $id, $slot ) {
	$id   = esc_attr( $id );
	$slot = esc_attr( $slot );
	return '
	<div id="'. $id .'" class="ad-wrap ad-inarticle" style="min-height:280px;margin:24px 0">
		<ins class="adsbygoogle"
			 style="display:block"
			 data-ad-client="ca-pub-9101284402640935"
			 data-ad-slot="'. $slot .'"
			 data-ad-format="auto"
			 data-full-width-responsive="true"></ins>
	</div>';
}

/** Choose positions based on paragraph count; keep at least 2-paragraph gaps; cap to last-1 */
function asn_choose_positions( $para_count ) {
	$targets = array();

	if ( $para_count <= 1 ) return $targets;
	$max_idx = max( 1, $para_count - 1 ); // never after the final paragraph

	if ( $para_count <= 4 ) {
		$base = array(2);
	} elseif ( $para_count <= 7 ) {
		$base = array(2,5);
	} elseif ( $para_count <= 12 ) {
		$base = array(2,5,9);
	} else {
		// ≥13 paragraphs → add fourth at p12
		$base = array(2,5,9,12);
	}

	// Cap to max_idx and enforce ≥2-paragraph spacing
	$filtered = array();
	$prev = 0;
	foreach ( $base as $p ) {
		if ( $p <= $max_idx && (empty($filtered) || ($p - $prev) >= 2) ) {
			$filtered[] = $p;
			$prev = $p;
		}
	}
	return $filtered;
}

/** Inject in-article ads at dynamic positions */
function asn_insert_dynamic_inarticle_ads( $content ) {
	if ( is_admin() || is_feed() || is_search() || is_archive() ) return $content;
	if ( ! in_the_loop() || ! is_main_query() ) return $content;
	if ( ! is_singular( array( 'post', 'page' ) ) ) return $content;

	// Avoid re-inserting if our markers exist
	if ( strpos( $content, 'class="ad-inarticle"' ) !== false ) return $content;

	// Split by </p> while keeping the delimiter
	$parts = preg_split( '#(</p>)#i', $content, -1, PREG_SPLIT_DELIM_CAPTURE );
	if ( ! $parts || count( $parts ) < 3 ) return $content;

	// Count paragraphs = number of closing </p>
	$para_count = 0;
	for ( $i = 1; $i < count($parts); $i += 2 ) {
		if ( stripos( $parts[$i], '</p>' ) !== false ) $para_count++;
	}

	$positions = asn_choose_positions( $para_count );
	if ( empty( $positions ) ) return $content;

	$slots = json_decode( ASN_INARTICLE_SLOTS, true );
	if ( ! is_array( $slots ) || empty( $slots ) ) return $content;

	$out        = '';
	$para_index = 0;
	$ad_index   = 0;

	for ( $i = 0; $i < count( $parts ); $i += 2 ) {
		$p  = $parts[ $i ];
		$cl = isset( $parts[ $i + 1 ] ) ? $parts[ $i + 1 ] : '';

		$out .= $p;
		if ( $cl !== '' ) {
			$out .= $cl;
			$para_index++;

			if ( in_array( $para_index, $positions, true ) && isset( $slots[ $ad_index ] ) ) {
				$ad_id = 'asn-inart-' . ( $ad_index + 1 );
				$out  .= asn_build_inarticle_ad( $ad_id, $slots[ $ad_index ] );
				$ad_index++;
			}
			// Stop if we've used all slots we have
			if ( $ad_index >= count($slots) ) {
				// concatenate remaining parts untouched
				for ( $j = $i + 2; $j < count($parts); $j++ ) $out .= $parts[$j];
				return $out;
			}
		}
	}

	return $out;
}
add_filter( 'the_content', 'asn_insert_dynamic_inarticle_ads', 18 );

/** Lazy-render any in-article ads near viewport (~250px early) */
add_action( 'wp_footer', function () {
	if ( is_admin() ) return;
	if ( function_exists('is_amp_endpoint') && is_amp_endpoint() ) return; ?>
<script>
(function(){
	function renderOnce(ins){
		if (!ins || ins.dataset.loaded) return;
		ins.dataset.loaded = "1";
		try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){}
	}
	function setupOne(wrap){
		var ins = wrap.querySelector('ins.adsbygoogle');
		if (!ins) return;
		var r  = wrap.getBoundingClientRect();
		var vh = window.innerHeight || document.documentElement.clientHeight;
		if (r.top < vh + 120) { renderOnce(ins); return; }
		var io = new IntersectionObserver(function(entries){
			entries.forEach(function(e){
				if (e.isIntersecting) { renderOnce(ins); io.disconnect(); }
			});
		}, { rootMargin: '250px 0px' });
		io.observe(wrap);
	}
	function ready(fn){ if(document.readyState!=='loading'){fn();} else {document.addEventListener('DOMContentLoaded',fn);} }
	ready(function(){
		document.querySelectorAll('.ad-inarticle').forEach(setupOne);
	});
})();
</script>
<?php
}, 99 );

/** Tiny CSS: contain layout + center */
add_action( 'wp_enqueue_scripts', function () {
	$css = '.ad-wrap{contain:layout paint;display:block;width:100%;} .ad-inarticle .adsbygoogle{display:block;margin:0 auto;}';
	wp_register_style('asn-inarticle-dyn-css', false);
	wp_enqueue_style('asn-inarticle-dyn-css');
	wp_add_inline_style('asn-inarticle-dyn-css', $css);
}, 20);




/** =======================================================================
 * GOOGLE ADS: precise placement using server-side HTML injection
 * - Loader once in <head>
 * - Ad #1: BEFORE <div class="site-wrap"> (so AFTER navbar)
 * - Ad #2: BEFORE <div class="e-shared-sec entry-sec"> (Share block)
 * - Skips admin/feeds/AMP; prevents duplicates; CLS-safe
 * ======================================================================= */

/** (Optional) small networking hints */
add_action( 'wp_head', function () {
  if ( is_admin() || is_feed() ) return;
  if ( function_exists('is_amp_endpoint') && is_amp_endpoint() ) return;
  echo '<link rel="preconnect" href="https://pagead2.googlesyndication.com">' . "\n";
  echo '<link rel="preconnect" href="https://googleads.g.doubleclick.net">' . "\n";
}, 4 );

/** Load AdSense LOADER once (Site Kit tag disabled) */
add_action( 'wp_head', function () {
  if ( is_admin() || is_feed() ) return;
  if ( function_exists('is_amp_endpoint') && is_amp_endpoint() ) return;
  echo '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9101284402640935" crossorigin="anonymous"></script>' . "\n";
}, 5 );

/** Remove any old header-ad hook that printed above navbar */
add_action( 'init', function () {
  remove_action( 'wp_body_open', 'asn_header_top_adsense', 5 );
});

/** One output buffer that places BOTH ads with regex (safer than the_content) */
add_action( 'template_redirect', function () {
  if ( is_admin() || is_feed() || is_robots() ) return;
  if ( function_exists('is_amp_endpoint') && is_amp_endpoint() ) return;
  if ( ! ( is_singular( array( 'post', 'page' ) ) || is_home() || is_front_page() || is_archive() ) ) {
    // We still inject header ad site-wide; adjust this condition if needed
  }

  ob_start( function( $html ) {

    // === Ad #1: Header (before .site-wrap), only if not already present ===
    if ( strpos( $html, 'id="asn-header-ad"' ) === false ) {
      $ad1 = <<<HTML
<div id="asn-header-ad" class="ad-wrap ad-header-center" style="min-height:100px;">
  <div class="rb-container edge-padding">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-9101284402640935"
         data-ad-slot="6445109879"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
HTML;

      // Insert BEFORE first <div class="site-wrap">
      $pattern_sitewrap = '/(<div\b[^>]*\bclass=(["\'])[^\2>]*\bsite-wrap\b[^\2>]*\2[^>]*>)/i';
      $html = preg_replace( $pattern_sitewrap, $ad1 . '$1', $html, 1 ) ?: $html;
    }

    // === Ad #2: Before the Share block, only on single post/page ===
    if ( ( is_singular( array( 'post', 'page' ) ) ) && strpos( $html, 'id="asn-share-ad"' ) === false ) {

      $ad2 = <<<HTML
<div id="asn-share-ad" class="ad-wrap ad-below-post" style="min-height:280px;margin:24px 0;">
  <div class="rb-container edge-padding">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-9101284402640935"
         data-ad-slot="8680390978"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
HTML;

      /**
       * Insert BEFORE first <div class="e-shared-sec entry-sec">
       * Matches regardless of attribute order/spacing; single replacement.
       */
      $pattern_share = '/(<div\b[^>]*\bclass=(["\'])[^\2>]*\be-shared-sec\b[^\2>]*\bentry-sec\b[^\2>]*\2[^>]*>)/i';

      $replaced = preg_replace( $pattern_share, $ad2 . '$1', $html, 1 );

      if ( $replaced ) {
        $html = $replaced;
      } else {
        // Fallback: append at the end of the main article container if Share block not found
        // Try to find </article> of the main post.
        $html = preg_replace( '/(<\/article>)/i', $ad2 . '$1', $html, 1 ) ?: $html;
      }
    }

    return $html;
  } );
}, 1 );

/** Styling: center, constrain width, reduce CLS wiggle */
add_action('wp_enqueue_scripts', function () {
  $css = <<<CSS
  .ad-wrap { contain: layout paint; display:block; width:100%; }
  .ad-header-center, .ad-below-post { text-align:center; margin-left:auto; margin-right:auto; }
  .ad-header-center .rb-container,
  .ad-below-post .rb-container { margin:0 auto; }
  .ad-header-center .adsbygoogle,
  .ad-below-post  .adsbygoogle { display:block; margin:0 auto; }
  @media (max-width: 767px) { #asn-header-ad { min-height: 90px; } }
  @media (min-width: 768px) { #asn-header-ad { min-height: 100px; } }
CSS;
  wp_register_style('asn-adsense-placement', false);
  wp_enqueue_style('asn-adsense-placement');
  wp_add_inline_style('asn-adsense-placement', $css);
}, 20);











  /**
 * Last-resort remover for a hard-printed preload tag.
 * Carefully removes only the Foxiz icons.woff2 preload.
 */
add_action('template_redirect', function () {
    ob_start(function ($html) {
        return preg_replace(
            '#<link[^>]*\srel=["\']preload["\'][^>]*\shref=["\'][^"\']*foxiz/assets/fonts/icons\.woff2[^"\']*["\'][^>]*>#i',
            '',
            $html
        );
    });
}, 0);

add_action('shutdown', function () {
    // Flush the buffer if still open (avoid nested buffer notices).
    while (ob_get_level() > 0) { @ob_end_flush(); }
}, PHP_INT_MAX);




















/* ========= 1) Core params early (for ALL public pages that might paginate) ========= */
add_action( 'wp_head', function () {
    if ( is_admin() ) return;

    $params = [
        'ajaxurl'         => admin_url( 'admin-ajax.php' ),
        'security'        => wp_create_nonce( 'foxiz-ajax' ),
        'darkModeID'      => 'RubyDarkMode',
        'yesPersonalized' => '',
        'cookieDomain'    => '',
        'cookiePath'      => '/',
    ];
    $script = 'var foxizCoreParams = ' . wp_json_encode( $params ) . ';';

    if ( function_exists( 'wp_print_inline_script_tag' ) ) {
        echo wp_print_inline_script_tag( $script, [ 'id' => 'foxiz-core-js-extra' ] );
    } else {
        echo '<script id="foxiz-core-js-extra">' . $script . '</script>';
    }

    // Optional global UI params
    $ui = 'window.foxizParams = ' . wp_json_encode( [
        'sliderSpeed' => '5000',
        'sliderEffect'=> 'slide',
        'sliderFMode' => '1',
    ] ) . ';';
    if ( function_exists( 'wp_print_inline_script_tag' ) ) {
        echo wp_print_inline_script_tag( $ui, [ 'id' => 'foxiz-ui-js-extra' ] );
    } else {
        echo '<script id="foxiz-ui-js-extra">' . $ui . '</script>';
    }
}, 1);

/* ========= 2) Context detection ========= */
function my_detect_view_context() {
    if ( is_front_page() || is_home() ) return 'home';
    if ( function_exists('is_product_category') && is_product_category() ) return 'category';
    if ( is_category() || is_tag() || is_tax() ) return 'category';
    if ( is_search() ) return 'search';
    if ( is_author() ) return 'author';
    if ( is_singular('post') ) return 'post';
    if ( is_page() ) return 'page';
    return 'other';
}

/* ========= 3) Whitelist per context ========= */
function my_get_allowed_js_handles_by_context( $context ) {
    $allowed = [
        'home'     => [ 'main', 'pagination' ],
        'category' => [ 'main', 'pagination' ],
        'search'   => [],
        'author'   => [],
        'post'     => [ 'comment', 'download', 'main', 'pagination', 'foxiz-core' ],
        'page'     => [ 'comment', 'download', 'foxiz-core' ],
        'other'    => [],
    ];
    return isset( $allowed[ $context ] ) ? (array) apply_filters( 'my_allowed_js_handles', $allowed[ $context ], $context ) : [];
}

/* ========= 4) Enqueue only what you want on each view ========= */
function my_register_context_only_scripts() {
    $context = my_detect_view_context();

    // Paths (change if different)
    $main          = 'https://aistudynow.com/wp-content/themes/js/main.js';
    $pagination_js = 'https://aistudynow.com/wp-content/themes/js/pagination.js'; // <- correct file!
    $comment       = 'https://aistudynow.com/wp-content/themes/js/comment.js';
    $download      = 'https://aistudynow.com/wp-content/themes/js/download-form-validation.js';
    $core_js       = 'https://aistudynow.com/wp-content/themes/js/core.js';

    /* ---------------- HOME (unchanged, still load_more) ---------------- */
    if ( $context === 'home' ) {
        wp_enqueue_script( 'main',       $main, [], '1.0.0', true );
        wp_enqueue_script( 'pagination', $pagination_js, [], '1.0.1', true );

        $home_block_globals = <<<JS
var uid_cfc8f6c = {"uuid":"uid_cfc8f6c","category":"208","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392","paged":"1","page_max":"1"};
var uid_0d9c5d1 = {"uuid":"uid_0d9c5d1","category":"212","name":"grid_flex_2","order":"date_post","posts_per_page":"8","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180","paged":"1","page_max":"4"};
var uid_c9675dd = {"uuid":"uid_c9675dd","category":"209","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180,5328,5291,5257,5239,5216,5192,5151,5124","paged":"1","page_max":"1"};
var uid_1c5cfd6 = {"uuid":"uid_1c5cfd6","category":"215","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180,5328,5291,5257,5239,5216,5192,5151,5124,5080,5077,4925,4914,4580","paged":"1","page_max":"1"};
JS;
        wp_add_inline_script( 'pagination', $home_block_globals, 'before' );
        return;
    }

    /* ------------- CATEGORY / TAG / TAXONOMY — INFINITE SCROLL ------------- */
    /* ------------- CATEGORY / TAG / TAXONOMY — AUTO mode (Load More or Infinite) ------------- */
if ( $context === 'category' ) {
    $main          = 'https://aistudynow.com/wp-content/themes/js/main.js';
    $pagination_js = 'https://aistudynow.com/wp-content/themes/js/pagination.js';

    wp_enqueue_script( 'main',       $main, [], '4.0.0', true );
    wp_enqueue_script( 'pagination', $pagination_js, [], '1.0.1', true );

    global $wp_query;
    $qo             = get_queried_object();
    $taxonomy       = isset($qo->taxonomy) ? $qo->taxonomy : 'category'; // category|post_tag|custom_tax
    $term_id        = (int) ($qo->term_id ?? 0);
    $page_max       = (int) ($wp_query ? $wp_query->max_num_pages : 1);
    $posts_per_page = (int) get_query_var('posts_per_page', get_option('posts_per_page'));
    $paged          = (int) max(1, get_query_var('paged'));

    // Base settings (do NOT force pagination mode here)
    $settings = [
        'uuid'            => null,               // filled at runtime with wrapper.id
        'name'            => 'grid_flex_2',
        'order'           => 'date_posts',       // archive needs "date_posts"
        'posts_per_page'  => (string) $posts_per_page,
        'pagination'      => null,               // auto-detect from DOM
        'unique'          => '1',
        'crop_size'       => 'foxiz_crop_g1',
        'entry_category'  => 'bg-4',
        'title_tag'       => 'h2',
        'entry_meta'      => ['author','category'],
        'review_meta'     => '-1',
        'excerpt_source'  => 'tagline',
        'readmore'        => 'Read More',
        'block_structure' => 'thumbnail, meta, title',
        'divider_style'   => 'solid',
        // taxonomy filter
        'entry_tax'       => $taxonomy,
        'category'        => (string) $term_id,  // Foxiz expects key "category" even for tags
        // paging
        'paged'           => (string) $paged,
        'page_max'        => (string) $page_max,
    ];

    // Inject globals before pagination.js runs
    wp_add_inline_script(
        'pagination',
        'var foxizCoreParams = ' . wp_json_encode( [
            'ajaxurl'  => admin_url( 'admin-ajax.php' ),
            'security' => wp_create_nonce( 'foxiz-ajax' ),
        ] ) . ';',
        'before'
    );
    wp_add_inline_script(
        'pagination',
        'window.foxizParams = ' . wp_json_encode( [
            'sliderSpeed' => '5000',
            'sliderEffect'=> 'slide',
            'sliderFMode' => '1',
        ] ) . ';',
        'before'
    );

    // Bootstrap: find wrapper, detect mode, bind uid_*, ensure sentinel if infinite
    $bootstrap = <<<JS
(function(){
  // 1) Locate the actual archive block wrapper
  var btn = document.querySelector('.pagination-wrap .loadmore-trigger');
  var block = (btn && (btn.closest('.block-wrap') || btn.closest('.archive-block') || btn.closest('.site-main'))) ||
              document.querySelector('.block-wrap, .archive-block, .site-main');
  if (!block) return;

  if (!block.id) {
    block.id = 'uid_' + Math.random().toString(36).slice(2,9);
  }

  // 2) Build settings and detect mode from DOM
  var S = %s; // settings from PHP
  S.uuid = block.id;

  var hasLoadMoreBtn = !!document.querySelector('.pagination-wrap .loadmore-trigger');
  var hasSentinel    = !!block.querySelector('.pagination-infinite');

  var mode = hasLoadMoreBtn ? 'load_more' : (hasSentinel ? 'infinite_scroll' : 'infinite_scroll');
  S.pagination = mode;

  // 3) Bind to window[uid]
  window[block.id] = S;

  // 4) If infinite_scroll, ensure sentinel exists & hide load-more UI
  if (mode === 'infinite_scroll') {
    var inner = block.querySelector('.block-inner') || block;
    var sentinel = inner.querySelector('.pagination-infinite');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.className = 'pagination-infinite';
      sentinel.innerHTML = '<i class="rb-loader" aria-hidden="true"></i>';
      inner.appendChild(sentinel);
    }
    var wrap = block.querySelector('.pagination-wrap');
    if (wrap) wrap.style.display = 'none';
  }
})();
JS;

    wp_add_inline_script(
        'pagination',
        sprintf( $bootstrap, wp_json_encode( $settings ) ),
        'before'
    );

    return;
}

    /* ------------- SINGLE POST / PAGE (unchanged) ------------- */
    if ( $context === 'post' || $context === 'page' ) {
        wp_enqueue_script( 'comment',    $comment, [], '1.0.0', true );
        wp_enqueue_script( 'main',       $main, [], '2.0.0', true );
        wp_enqueue_script( 'pagination', $pagination_js, [], '5.0.1', true );
        wp_enqueue_script( 'download',   $download, [], '1.0.0', true );

        // If you still need core.js on post/page
        wp_register_script( 'foxiz-core', $core_js, [], '1.0.0', true );
        wp_enqueue_script( 'foxiz-core' );
        return;
    }
}
add_action( 'wp_enqueue_scripts', 'my_register_context_only_scripts', 20 );

/* ========= 5) Remove everything not whitelisted ========= */
function my_disable_all_js_except_whitelisted() {
    if ( is_admin() || wp_doing_ajax() ) return;
    global $wp_scripts;
    if ( ! $wp_scripts instanceof WP_Scripts ) return;

    $context = my_detect_view_context();
    $targets = [ 'home', 'category', 'search', 'author', 'post', 'page' ];
    if ( ! in_array( $context, $targets, true ) ) return;

    $allowed = array_values( array_unique( array_filter( my_get_allowed_js_handles_by_context( $context ), 'strlen' ) ) );

    foreach ( (array) $wp_scripts->queue as $handle ) {
        if ( ! in_array( $handle, $allowed, true ) ) {
            wp_dequeue_script( $handle );
            wp_deregister_script( $handle );
        }
    }

    add_action( 'wp_print_scripts', function() use ( $allowed ) {
        global $wp_scripts;
        if ( ! $wp_scripts ) return;
        foreach ( (array) $wp_scripts->queue as $handle ) {
            if ( ! in_array( $handle, $allowed, true ) ) {
                wp_dequeue_script( $handle );
                wp_deregister_script( $handle );
            }
        }
    }, PHP_INT_MAX );

    add_action( 'wp_print_footer_scripts', function() use ( $allowed ) {
        global $wp_scripts;
        if ( ! $wp_scripts ) return;
        foreach ( (array) $wp_scripts->queue as $handle ) {
            if ( ! in_array( $handle, $allowed, true ) ) {
                wp_dequeue_script( $handle );
                wp_deregister_script( $handle );
            }
        }
    }, PHP_INT_MAX );
}
add_action( 'wp_enqueue_scripts', 'my_disable_all_js_except_whitelisted', PHP_INT_MAX );

/* ========= 6) Final gate: only print tags for allowed handles ========= */
add_filter( 'script_loader_tag', function( $tag, $handle, $src ) {
    if ( is_admin() || wp_doing_ajax() ) return $tag;
    $context = my_detect_view_context();
    $targets = [ 'home', 'category', 'search', 'author', 'post', 'page' ];
    if ( ! in_array( $context, $targets, true ) ) return $tag;
    $allowed = my_get_allowed_js_handles_by_context( $context );
    return in_array( $handle, $allowed, true ) ? $tag : '';
}, PHP_INT_MAX, 3 );

/* ========= 7) (Optional) Force-print core.js on post/page if something blocks it ========= */
add_action( 'wp_print_footer_scripts', function () {
    $ctx = my_detect_view_context();
    if ( $ctx !== 'post' && $ctx !== 'page' ) return;

    global $wp_scripts;
    $printed = ( $wp_scripts && ! empty( $wp_scripts->done ) && in_array( 'foxiz-core', (array) $wp_scripts->done, true ) );
    if ( ! $printed ) {
        echo '<script id="foxiz-core-js" src="https://aistudynow.com/wp-content/themes/js/core.js"></script>' . "\n";
    }
}, PHP_INT_MAX );








// Insert vdo.ai snippet after the first paragraph on single posts & pages (NO delay of library)
function vdoai_after_first_paragraph( $content ) {
    // Don't run in admin, feeds, search, archives, OR on the homepage
    if ( is_admin() || is_feed() || is_search() || is_archive() || is_front_page() || is_home() ) {
        return $content;
    }

    if ( ! in_the_loop() || ! is_main_query() ) return $content;
    if ( ! is_singular( array( 'post', 'page' ) ) ) return $content;
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) return $content;
    if ( strpos( $content, 'id="v-aistudynow"' ) !== false ) return $content;

    $src = 'https://a.vdo.ai/core/v-aistudynow/vdo.ai.js';

    // Reserve space to avoid CLS
    $snippet  = '<div id="v-aistudynow" style="min-height:280px"></div>';
    // Load library non-blocking, not delayed
    $snippet .= '<script src="' . esc_url( $src ) . '" id="vdoai-js" defer></script>';

    $closing_p = '</p>';
    $pos = strpos( $content, $closing_p );

    return ($pos !== false)
        ? substr( $content, 0, $pos + strlen( $closing_p ) ) . $snippet . substr( $content, $pos + strlen( $closing_p ) )
        : $content . $snippet;
}
add_filter( 'the_content', 'vdoai_after_first_paragraph', 20 );










add_action('wp_footer', function () { ?>
<script>
(function(){
  const body = document.body;

  // remove if already present
  if (body.getAttribute('aria-hidden') === 'true') {
    body.removeAttribute('aria-hidden');
  }

  // prevent future changes
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'aria-hidden') {
        if (body.getAttribute('aria-hidden') === 'true') {
          body.removeAttribute('aria-hidden');
        }
      }
    }
  });
  obs.observe(body, { attributes: true, attributeFilter: ['aria-hidden'] });
})();
</script>
<?php }, 100);













/* foxiz child theme */
function allow_json_mime($mimes) {
$mimes['json'] = 'application/json';
return $mimes;
}
add_filter('upload_mimes', 'allow_json_mime');