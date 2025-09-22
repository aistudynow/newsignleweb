<?php
if ( ! defined( 'ABSPATH' ) ) {
    return;
}

/**
 * -------------------------------------------------------------------------
 * Stylesheet deferral helpers
 * -------------------------------------------------------------------------
 */
function wd4_should_defer_styles(): bool {
    $is_ajax = function_exists( 'wp_doing_ajax' ) && wp_doing_ajax();

    if ( is_admin() || $is_ajax || is_customize_preview() ) {
        return false;
    }

    if ( function_exists( 'wd4_is_front_login_page' ) && wd4_is_front_login_page() ) {
        return false;
    }

    if ( is_search() ) {
        return false;
    }

    /**
     * Allow short-circuiting of the stylesheet deferral logic.
     */
    return (bool) apply_filters( 'wd4_enable_deferred_styles', true );
}


function wd4_is_frontend_request(): bool {
    if ( is_admin() ) {
        return false;
    }

    if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
        return false;
    }

    if ( defined( 'DOING_CRON' ) && DOING_CRON ) {
        return false;
    }

    if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        return false;
    }

    return true;
}









/**
 * -------------------------------------------------------------------------
 * Largest Contentful Paint image helpers
 * -------------------------------------------------------------------------
 */
function wd4_to_positive_int( $value ): int {
    $value = (int) $value;

    return ( $value > 0 ) ? $value : 0;
}

function wd4_normalize_attachment_id( $attachment ): int {
    if ( is_numeric( $attachment ) ) {
        return wd4_to_positive_int( $attachment );
    }

    if ( is_object( $attachment ) && isset( $attachment->ID ) ) {
        return wd4_to_positive_int( $attachment->ID );
    }

    return 0;
}

function wd4_get_main_post_thumbnail_id(): int {
    static $cached = null;

    if ( null !== $cached ) {
        return $cached;
    }

    $cached = 0;

    if ( ! wd4_is_frontend_request() ) {
        return $cached;
    }

    if ( function_exists( 'is_singular' ) && is_singular() ) {
        $object = get_queried_object();

        if ( is_object( $object ) && isset( $object->ID ) ) {
            $cached = wd4_to_positive_int( get_post_thumbnail_id( $object ) );
        }
    }

    $cached = (int) apply_filters( 'wd4_main_post_thumbnail_id', $cached );

    return $cached;
}

function wd4_is_main_post_thumbnail_id( int $attachment_id ): bool {
    $attachment_id = wd4_to_positive_int( $attachment_id );

    if ( $attachment_id <= 0 ) {
        return false;
    }

    return $attachment_id === wd4_get_main_post_thumbnail_id();
}

function wd4_get_attachment_reference_fragments( int $attachment_id ): array {
    static $cache = array();

    $attachment_id = wd4_to_positive_int( $attachment_id );

    if ( $attachment_id <= 0 ) {
        return array();
    }

    if ( isset( $cache[ $attachment_id ] ) ) {
        return $cache[ $attachment_id ];
    }

    $fragments   = array( 'wp-image-' . $attachment_id );
    $attachment_url = function_exists( 'wp_get_attachment_url' ) ? wp_get_attachment_url( $attachment_id ) : '';

    if ( $attachment_url ) {
        $fragments[] = $attachment_url;

        $path = parse_url( $attachment_url, PHP_URL_PATH );
        if ( $path ) {
            $basename = basename( $path );
            if ( $basename ) {
                $fragments[] = $basename;
            }
        }
    }

    $fragments = array_values( array_unique( array_filter( $fragments ) ) );

    $cache[ $attachment_id ] = $fragments;

    return $cache[ $attachment_id ];
}


function wd4_guess_image_mime_from_url( string $url ): string {
    if ( '' === $url ) {
        return '';
    }

    $path = parse_url( $url, PHP_URL_PATH );
    if ( ! $path ) {
        return '';
    }

    $extension = strtolower( pathinfo( $path, PATHINFO_EXTENSION ) );

    switch ( $extension ) {
        case 'avif':
            return 'image/avif';
        case 'webp':
            return 'image/webp';
        case 'png':
            return 'image/png';
        case 'gif':
            return 'image/gif';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'svg':
            return 'image/svg+xml';
        case 'bmp':
            return 'image/bmp';
    }

    return '';
}

function wd4_set_lcp_preload_data( array $data ): void {
    global $wd4_lcp_preload_data;

    $defaults = array(
        'src'    => '',
        'srcset' => '',
        'sizes'  => '',
        'type'   => '',
    );

    $data = array_merge( $defaults, array(
        'src'    => isset( $data['src'] ) ? (string) $data['src'] : '',
        'srcset' => isset( $data['srcset'] ) ? (string) $data['srcset'] : '',
        'sizes'  => isset( $data['sizes'] ) ? (string) $data['sizes'] : '',
        'type'   => isset( $data['type'] ) ? (string) $data['type'] : '',
    ) );

    if ( '' === $data['src'] ) {
        return;
    }

    if ( '' === $data['type'] ) {
        $data['type'] = wd4_guess_image_mime_from_url( $data['src'] );
    }

    $wd4_lcp_preload_data = $data;
}

function wd4_get_lcp_preload_data(): array {
    global $wd4_lcp_preload_data;

    return ( is_array( $wd4_lcp_preload_data ) ) ? $wd4_lcp_preload_data : array();
}

function wd4_capture_lcp_preload_data_from_attr( array $attr ): void {
    if ( empty( $attr ) ) {
        return;
    }

    $data = array(
        'src'    => isset( $attr['src'] ) ? (string) $attr['src'] : '',
        'srcset' => isset( $attr['srcset'] ) ? (string) $attr['srcset'] : '',
        'sizes'  => isset( $attr['sizes'] ) ? (string) $attr['sizes'] : '',
    );

    if ( '' === $data['src'] ) {
        return;
    }

    wd4_set_lcp_preload_data( $data );
}

function wd4_capture_lcp_preload_data_from_img_html( string $html ): void {
    if ( '' === trim( $html ) ) {
        return;
    }

    $attr = array();

    if ( preg_match_all( "/([a-zA-Z0-9_:-]+)\s*=\s*(\"|')(.*?)\\2/s", $html, $matches, PREG_SET_ORDER ) ) {
        foreach ( $matches as $match ) {
            $name  = strtolower( $match[1] );
            $value = html_entity_decode( $match[3], ENT_QUOTES, 'UTF-8' );

            $attr[ $name ] = $value;
        }
    }

    if ( empty( $attr['src'] ) && ! empty( $attr['data-src'] ) ) {
        $attr['src'] = $attr['data-src'];
    }

    if ( empty( $attr['src'] ) && ! empty( $attr['data-lazy-src'] ) ) {
        $attr['src'] = $attr['data-lazy-src'];
    }

    wd4_capture_lcp_preload_data_from_attr( $attr );
}

function wd4_resolve_lcp_preload_data(): array {
    $data = wd4_get_lcp_preload_data();

    if ( ! empty( $data['src'] ) ) {
        return $data;
    }

    $candidate = wd4_get_lcp_candidate();

    if ( empty( $candidate ) ) {
        return array();
    }

    $data = array(
        'src'    => isset( $candidate['src'] ) ? (string) $candidate['src'] : '',
        'srcset' => isset( $candidate['srcset'] ) ? (string) $candidate['srcset'] : '',
        'sizes'  => isset( $candidate['sizes'] ) ? (string) $candidate['sizes'] : '',
    );

    if ( '' === $data['src'] ) {
        return array();
    }

    wd4_set_lcp_preload_data( $data );

    return wd4_get_lcp_preload_data();
}

function wd4_build_lcp_preload_tag( array $data ): string {
    if ( empty( $data['src'] ) ) {
        return '';
    }

    $attributes = array(
        "rel='preload'",
        "as='image'",
        "href='" . esc_url( $data['src'] ) . "'",
        "fetchpriority='high'",
    );

    if ( ! empty( $data['type'] ) ) {
        $attributes[] = "type='" . esc_attr( $data['type'] ) . "'";
    }

    if ( ! empty( $data['srcset'] ) ) {
        $attributes[] = "imagesrcset='" . esc_attr( $data['srcset'] ) . "'";
    }

    if ( ! empty( $data['sizes'] ) ) {
        $attributes[] = "imagesizes='" . esc_attr( $data['sizes'] ) . "'";
    }

    return '<link ' . implode( ' ', $attributes ) . '>';
}

function wd4_maybe_inject_lcp_preload_link( string $html ): string {
    static $injected = false;

    if ( $injected || '' === $html ) {
        return $html;
    }

    if ( false === stripos( $html, '</head>' ) ) {
        return $html;
    }

    $data = wd4_resolve_lcp_preload_data();

    if ( empty( $data['src'] ) ) {
        return $html;
    }

    $tag = wd4_build_lcp_preload_tag( $data );

    if ( '' === $tag ) {
        return $html;
    }

    $pattern = sprintf(
        '/<link\b[^>]*rel=(["\'])preload\1[^>]*href=(["\'])%s\2/i',
        preg_quote( $data['src'], '/' )
    );

    if ( preg_match( $pattern, $html ) ) {
        $injected = true;

        return $html;
    }

    $result = preg_replace( '/</head>/i', $tag . '</head>', $html, 1, $count );

    if ( null === $result || $count < 1 ) {
        return $html;
    }

    $injected = true;

    return $result;
}

function wd4_markup_references_attachment( string $html, int $attachment_id ): bool {
    if ( '' === $html ) {
        return false;
    }

    $attachment_id = wd4_to_positive_int( $attachment_id );

    if ( $attachment_id <= 0 ) {
        return false;
    }

    $haystack_lower = function_exists( 'strtolower' ) ? strtolower( $html ) : $html;

    foreach ( wd4_get_attachment_reference_fragments( $attachment_id ) as $fragment ) {
        if ( false !== strpos( $html, $fragment ) ) {
            return true;
        }

        if ( false !== strpos( $haystack_lower, strtolower( $fragment ) ) ) {
            return true;
        }
    }

    return false;
}

function wd4_should_prioritize_lcp_image( array $attr, $attachment = null, $size = null, $context = null ): bool {
    if ( ! wd4_is_frontend_request() ) {
        return false;
    }

    static $prioritized = false;

    if ( $prioritized ) {
        return false;
    }

    $attachment_id = wd4_normalize_attachment_id( $attachment );
    $class_list    = isset( $attr['class'] ) ? strtolower( (string) $attr['class'] ) : '';
    $src           = isset( $attr['src'] ) ? trim( (string) $attr['src'] ) : '';
    if ( '' === $src && isset( $attr['data-src'] ) ) {
        $src = trim( (string) $attr['data-src'] );
    }
    if ( '' === $src && isset( $attr['data-lazy-src'] ) ) {
        $src = trim( (string) $attr['data-lazy-src'] );
    }
    $width  = isset( $attr['width'] ) ? wd4_to_positive_int( $attr['width'] ) : 0;
    $height = isset( $attr['height'] ) ? wd4_to_positive_int( $attr['height'] ) : 0;

    $is_main_thumbnail = wd4_is_main_post_thumbnail_id( $attachment_id );
    $should_prioritize = $is_main_thumbnail;

    if ( ! $should_prioritize ) {
        $should_prioritize = true;

        if ( '' === $class_list || false === strpos( $class_list, 'wp-post-image' ) ) {
            $should_prioritize = false;
        }

        if ( '' === $src ) {
            $should_prioritize = false;
        }

        $min_width  = apply_filters( 'wd4_lcp_candidate_min_width', 900, $attr, $attachment, $size, $context );
        $min_height = apply_filters( 'wd4_lcp_candidate_min_height', 500, $attr, $attachment, $size, $context );

        if ( $should_prioritize && $width && $width < $min_width ) {
            $should_prioritize = false;
        }

        if ( $should_prioritize && $height && $height < $min_height ) {
            $should_prioritize = false;
        }
    }

    $should_prioritize = apply_filters(
        'wd4_prioritize_lcp_image',
        $should_prioritize,
        $attr,
        $attachment,
        $size,
        $context
    );

    if ( ! $should_prioritize ) {
        return false;
    }

    wd4_capture_lcp_preload_data_from_attr( $attr );

    global $wd4_lcp_candidate;

    if ( ! is_array( $wd4_lcp_candidate ) ) {
        $wd4_lcp_candidate = array();
    }

    $wd4_lcp_candidate = array(
        'attachment_id' => $attachment_id,
        'width'         => $width,
        'height'        => $height,
        'context'       => $context,
        'src'           => $src,
        'srcset'        => $srcset,
        'sizes'         => $sizes,
        'size'          => $size,
        'is_main'       => $is_main_thumbnail,
    );

    $prioritized = true;

    return true;
}

function wd4_adjust_lcp_image_attributes( array $attr, $attachment = null, $size = null, $context = null ): array {
    if ( ! wd4_should_prioritize_lcp_image( $attr, $attachment, $size, $context ) ) {
        return $attr;
    }

    $attr['loading']       = 'eager';
    $attr['fetchpriority'] = 'high';

    if ( empty( $attr['decoding'] ) ) {
        $attr['decoding'] = 'async';
    }

    return $attr;
}
add_filter( 'wp_get_attachment_image_attributes', 'wd4_adjust_lcp_image_attributes', PHP_INT_MAX, 4 );

function wd4_get_lcp_candidate(): array {
    global $wd4_lcp_candidate;

    return ( is_array( $wd4_lcp_candidate ) ) ? $wd4_lcp_candidate : array();
}

function wd4_lcp_markup_matches_candidate( string $html, ?int $attachment_id = null ): bool {
    if ( '' === $html ) {
        return false;
    }

    $attachment_id = wd4_to_positive_int( $attachment_id );

    if ( $attachment_id > 0 && wd4_markup_references_attachment( $html, $attachment_id ) ) {
        return true;
    }

    $candidate = wd4_get_lcp_candidate();

    if ( ! empty( $candidate ) ) {
        $candidate_id  = wd4_to_positive_int( $candidate['attachment_id'] ?? 0 );
        $candidate_src = isset( $candidate['src'] ) ? (string) $candidate['src'] : '';

        if ( $candidate_id > 0 && wd4_markup_references_attachment( $html, $candidate_id ) ) {
            return true;
        }

        if ( '' !== $candidate_src ) {
            if ( false !== strpos( $html, $candidate_src ) ) {
                return true;
            }

            $path = parse_url( $candidate_src, PHP_URL_PATH );
            if ( $path ) {
                $basename = basename( $path );
                if ( $basename && false !== stripos( $html, $basename ) ) {
                    return true;
                }
            }
        }
    }

    $main_thumbnail_id = wd4_get_main_post_thumbnail_id();

    if ( $main_thumbnail_id > 0 && wd4_markup_references_attachment( $html, $main_thumbnail_id ) ) {
        return true;
    }

    return false;
}

function wd4_replace_or_add_img_attribute( string $html, string $name, string $value ): string {
    if ( '' === trim( $html ) ) {
        return $html;
    }

    $quoted_name = preg_quote( $name, '/' );
    $pattern     = sprintf( "#\\s%s\\s*=\\s*(['\"]).*?\\1#i", $quoted_name );
    $replacement = sprintf( ' %s="%s"', $name, esc_attr( $value ) );

    if ( preg_match( $pattern, $html ) ) {
        $result = preg_replace( $pattern, $replacement, $html, 1 );

        return ( null !== $result ) ? $result : $html;
    }

    $result = preg_replace(
        '/<img\b/i',
        sprintf( '<img %s="%s"', $name, esc_attr( $value ) ),
        $html,
        1
    );

    return ( null !== $result ) ? $result : $html;
}

function wd4_remove_img_attribute( string $html, string $name, int $limit = -1 ): string {
    if ( '' === trim( $html ) ) {
        return $html;
    }

    $quoted_name = preg_quote( $name, '/' );
    $pattern     = sprintf( '#\\s%s(?:\\s*=\\s*(?:["\']).*?(?:["\'])|\\s*=\\s*[^>\\s]+)?#i', $quoted_name );
    $limit       = ( 0 === $limit ) ? -1 : $limit;
    $result      = preg_replace( $pattern, '', $html, $limit );

    return ( null !== $result ) ? $result : $html;
}

function wd4_prioritize_img_html( string $html ): string {
    if ( '' === trim( $html ) ) {
        return $html;
    }

    $cleaned = wd4_remove_img_attribute( $html, 'loading' );
    $cleaned = wd4_remove_img_attribute( $cleaned, 'fetchpriority' );
    $cleaned = wd4_remove_img_attribute( $cleaned, 'decoding' );
    $cleaned = wd4_remove_img_attribute( $cleaned, 'data-wp-lazy-loading' );

    $updated = wd4_replace_or_add_img_attribute( $cleaned, 'loading', 'eager' );
    $updated = wd4_replace_or_add_img_attribute( $updated, 'fetchpriority', 'high' );
    $updated = wd4_replace_or_add_img_attribute( $updated, 'decoding', 'async' );

    return $updated;
}

function wd4_force_lcp_image_html( string $html, int $attachment_id, bool $force = false ): string {
    if ( '' === $html || ! wd4_is_frontend_request() ) {
        return $html;
    }

    if ( ! $force && ! wd4_lcp_markup_matches_candidate( $html, $attachment_id ) ) {
        return $html;
    }

    static $updated = false;

    if ( $updated && ! $force ) {
        return $html;
    }

    $prioritized = wd4_prioritize_img_html( $html );

    wd4_capture_lcp_preload_data_from_img_html( $prioritized );

    if ( $prioritized === $html ) {
        return $html;
    }

    if ( ! $force ) {
        $updated = true;
    }

    return $prioritized;
}

function wd4_prioritize_featured_lightbox_markup( string $html, bool &$processed ): string {
    if ( $processed || '' === $html ) {
        return $html;
    }

    if ( false === stripos( $html, 'featured-lightbox-trigger' ) ) {
        return $html;
    }

    $pattern = '/(<div\b[^>]*class=(["\']).*?featured-lightbox-trigger.*?\2[^>]*>)(.*?)(<\/div>)/is';

    $result = preg_replace_callback(
        $pattern,
        function ( array $matches ) use ( &$processed ) {
            if ( $processed ) {
                return $matches[0];
            }

            $inner = $matches[3];

            $inner_result = preg_replace_callback(
                '/<img\b[^>]*>/i',
                function ( array $img_matches ) use ( &$processed ) {
                    if ( $processed ) {
                        return $img_matches[0];
                    }

                    $processed = true;

                    $updated = wd4_prioritize_img_html( $img_matches[0] );

                    wd4_capture_lcp_preload_data_from_img_html( $updated );

                    return $updated;
                },
                $inner,
                1,
                $count
            );

            if ( $count < 1 || null === $inner_result ) {
                return $matches[0];
            }

            return $matches[1] . $inner_result . $matches[4];
        },
        $html,
        1,
        $div_count
    );

    if ( null === $result || $div_count < 1 ) {
        return $html;
    }

    return $result;
}

function wd4_adjust_lcp_image_markup( string $html, int $attachment_id, $size, $icon, $attr ): string {
    $force = wd4_is_main_post_thumbnail_id( $attachment_id );

    return wd4_force_lcp_image_html( $html, $attachment_id, $force );
}
add_filter( 'wp_get_attachment_image', 'wd4_adjust_lcp_image_markup', PHP_INT_MAX, 5 );

function wd4_adjust_post_thumbnail_markup( string $html, int $post_id, int $post_thumbnail_id, $size, $attr ): string {
    $force = wd4_is_main_post_thumbnail_id( $post_thumbnail_id );

    return wd4_force_lcp_image_html( $html, $post_thumbnail_id, $force );
}
add_filter( 'post_thumbnail_html', 'wd4_adjust_post_thumbnail_markup', PHP_INT_MAX, 5 );

function wd4_should_buffer_lcp_markup(): bool {
    if ( ! wd4_is_frontend_request() ) {
        return false;
    }

    if ( is_feed() || is_embed() ) {
        return false;
    }

    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return false;
    }

    return true;
}

function wd4_adjust_lcp_markup_via_buffer( string $html ): string {
    static $processed = false;

    if ( '' === $html ) {
        return $html;
    }

    if ( $processed ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    $html = wd4_prioritize_featured_lightbox_markup( $html, $processed );

    if ( $processed ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    if ( false === stripos( $html, 'wp-post-image' ) ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    $pattern = '/<img\b[^>]*class=("|\').*?wp-post-image.*?\1[^>]*>/is';

    if ( ! preg_match_all( $pattern, $html, $matches, PREG_OFFSET_CAPTURE ) ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    $targets = $matches[0];
    $chosen  = null;

    foreach ( $targets as $match ) {
        $fragment = $match[0];

        if ( wd4_lcp_markup_matches_candidate( $fragment ) ) {
            $chosen = $match;
            break;
        }
    }

    if ( null === $chosen ) {
        $main_thumbnail_id = wd4_get_main_post_thumbnail_id();

        if ( $main_thumbnail_id > 0 ) {
            foreach ( $targets as $match ) {
                if ( wd4_markup_references_attachment( $match[0], $main_thumbnail_id ) ) {
                    $chosen = $match;
                    break;
                }
            }
        }
    }

    if ( null === $chosen && isset( $targets[0] ) ) {
        $chosen = $targets[0];
    }

    if ( null === $chosen ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    $tag    = $chosen[0];
    $offset = (int) $chosen[1];

    $updated = wd4_prioritize_img_html( $tag );

    wd4_capture_lcp_preload_data_from_img_html( $updated );

    if ( $updated === $tag ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    $processed = true;

    $replaced = substr_replace( $html, $updated, $offset, strlen( $tag ) );

    if ( false === $replaced ) {
        return wd4_maybe_inject_lcp_preload_link( $html );
    }

    return wd4_maybe_inject_lcp_preload_link( $replaced );
}

function wd4_disable_lazy_loading_for_lcp_image( $value, string $image = '', string $context = '' ) {
    if ( ! wd4_is_frontend_request() ) {
        return $value;
    }

    if ( ! $value ) {
        return $value;
    }

    if ( '' === $image ) {
        return $value;
    }

    static $disabled = false;

    if ( $disabled ) {
        return $value;
    }

    if ( ! wd4_lcp_markup_matches_candidate( $image ) ) {
        return $value;
    }

    $disabled = true;

    return false;
}
add_filter( 'wp_img_tag_add_loading_attr', 'wd4_disable_lazy_loading_for_lcp_image', PHP_INT_MAX, 3 );

function wd4_bootstrap_lcp_markup_buffer(): void {
    static $started = false;

    if ( $started ) {
        return;
    }

    if ( ! wd4_should_buffer_lcp_markup() ) {
        return;
    }

    ob_start( 'wd4_adjust_lcp_markup_via_buffer' );
    $started = true;
}
add_action( 'template_redirect', 'wd4_bootstrap_lcp_markup_buffer', 0 );

function wd4_allow_fetchpriority_attribute( array $allowed_tags, string $context ): array {
    if ( isset( $allowed_tags['img'] ) && is_array( $allowed_tags['img'] ) && ! isset( $allowed_tags['img']['fetchpriority'] ) ) {
        $allowed_tags['img']['fetchpriority'] = true;
    }

    return $allowed_tags;
}
add_filter( 'wp_kses_allowed_html', 'wd4_allow_fetchpriority_attribute', 10, 2 );

/**
 * -------------------------------------------------------------------------
 * YouTube facade embeds
 * -------------------------------------------------------------------------
 */
function wd4_mark_youtube_facade_needed(): void {
    global $wd4_has_youtube_facade;

    $wd4_has_youtube_facade = true;
}

function wd4_has_youtube_facade(): bool {
    global $wd4_has_youtube_facade;

    return ! empty( $wd4_has_youtube_facade );
}

function wd4_extract_youtube_id( string $url ): string {
    if ( '' === $url ) {
        return '';
    }

    $parts = wp_parse_url( $url );
    if ( empty( $parts['host'] ) ) {
        return '';
    }

    $host = strtolower( $parts['host'] );
    $path = isset( $parts['path'] ) ? trim( (string) $parts['path'], '/' ) : '';
    $video_id = '';

    if ( false !== strpos( $host, 'youtu.be' ) ) {
        $video_id = $path;
    } elseif ( false !== strpos( $host, 'youtube.com' ) || false !== strpos( $host, 'youtube-nocookie.com' ) ) {
        if ( isset( $parts['query'] ) ) {
            parse_str( $parts['query'], $query_args );
            if ( ! empty( $query_args['v'] ) ) {
                $video_id = (string) $query_args['v'];
            }
        }

        if ( '' === $video_id && 0 === strpos( $path, 'embed/' ) ) {
            $video_id = substr( $path, 6 );
        }

        if ( '' === $video_id && 0 === strpos( $path, 'shorts/' ) ) {
            $video_id = substr( $path, 7 );
        }

        if ( '' === $video_id && '' !== $path ) {
            $segments = explode( '/', $path );
            $video_id = end( $segments );
        }
    }

    if ( '' === $video_id ) {
        return '';
    }

    $video_id = preg_replace( '/[^a-zA-Z0-9_-]/', '', $video_id );

    if ( ! is_string( $video_id ) || '' === $video_id ) {
        return '';
    }

    return $video_id;
}

function wd4_extract_iframe_title( string $html ): string {
    if ( '' === $html ) {
        return '';
    }

    if ( ! preg_match( '/title=(["\'])(.*?)\1/i', $html, $match ) ) {
        return '';
    }

    $charset = get_bloginfo( 'charset' );
    if ( ! $charset ) {
        $charset = 'UTF-8';
    }

    return html_entity_decode( trim( (string) $match[2] ), ENT_QUOTES, $charset );
}

function wd4_prepare_youtube_facade( string $html, string $url, array $attr = array() ): string {
    if ( '' === trim( $html ) || '' === trim( $url ) ) {
        return $html;
    }

    if ( ! wd4_is_frontend_request() ) {
        return $html;
    }

    if ( false !== strpos( $html, 'wd4-youtube-facade' ) ) {
        return $html;
    }

    $video_id = wd4_extract_youtube_id( $url );
    if ( '' === $video_id ) {
        return $html;
    }

    $title = '';
    if ( isset( $attr['title'] ) ) {
        $title = (string) $attr['title'];
    }

    if ( '' === $title && isset( $attr['aria-label'] ) ) {
        $title = (string) $attr['aria-label'];
    }

    if ( '' === $title ) {
        $title = wd4_extract_iframe_title( $html );
    }

    $title = trim( wp_strip_all_tags( $title ) );

    if ( '' === $title ) {
        $title = __( 'YouTube video', 'foxiz-child' );
    }

    $button_label = sprintf( __( 'Play video: %s', 'foxiz-child' ), $title );
    $thumbnail    = sprintf( 'https://i.ytimg.com/vi/%s/hqdefault.jpg', rawurlencode( $video_id ) );

    $facade  = '<div class="wd4-youtube-facade" data-youtube-id="' . esc_attr( $video_id ) . '" data-youtube-title="' . esc_attr( $title ) . '" data-youtube-params="autoplay=1&amp;rel=0">';
    $facade .= '<div class="wd4-youtube-facade__inner">';
    $facade .= '<button type="button" class="wd4-youtube-facade__trigger" aria-label="' . esc_attr( $button_label ) . '">';
    $facade .= '<span class="wd4-youtube-facade__thumb"><img src="' . esc_url( $thumbnail ) . '" alt="' . esc_attr( $title ) . '" decoding="async" loading="lazy"></span>';
    $facade .= '<span class="wd4-youtube-facade__play" aria-hidden="true"></span>';
    $facade .= '</button></div>';
    $facade .= '<noscript>' . $html . '</noscript>';
    $facade .= '</div>';

    wd4_mark_youtube_facade_needed();

    return $facade;
}

function wd4_embed_oembed_youtube_facade( $html, $url, $attr, $post_id ) {
    unset( $post_id );

    return wd4_prepare_youtube_facade( (string) $html, (string) $url, (array) $attr );
}
add_filter( 'embed_oembed_html', 'wd4_embed_oembed_youtube_facade', 10, 4 );

function wd4_render_block_youtube_facade( string $block_content, array $block ): string {
    if ( '' === $block_content ) {
        return $block_content;
    }

    if ( empty( $block['blockName'] ) ) {
        return $block_content;
    }

    $block_name = $block['blockName'];

    if ( 'core-embed/youtube' === $block_name ) {
        $attrs = isset( $block['attrs'] ) ? (array) $block['attrs'] : array();

        return wd4_prepare_youtube_facade( $block_content, isset( $attrs['url'] ) ? (string) $attrs['url'] : '', $attrs );
    }

    if ( 'core/embed' === $block_name ) {
        $attrs = isset( $block['attrs'] ) ? (array) $block['attrs'] : array();

        if ( isset( $attrs['providerNameSlug'] ) && 'youtube' === $attrs['providerNameSlug'] ) {
            return wd4_prepare_youtube_facade( $block_content, isset( $attrs['url'] ) ? (string) $attrs['url'] : '', $attrs );
        }
    }

    return $block_content;
}
add_filter( 'render_block', 'wd4_render_block_youtube_facade', 10, 2 );

function wd4_output_youtube_facade_styles(): void {
    if ( ! wd4_has_youtube_facade() ) {
        return;
    }

    $css = '.wd4-youtube-facade{position:relative;max-width:100%;}.wd4-youtube-facade__inner{position:relative;width:100%;background-color:#000;border-radius:12px;overflow:hidden;}.wd4-youtube-facade__inner::before{content:"";display:block;padding-top:56.25%;}.wd4-youtube-facade__trigger{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:0;background:transparent;padding:0;cursor:pointer;}.wd4-youtube-facade__trigger:focus{outline:2px solid #fff;outline-offset:2px;}.wd4-youtube-facade__thumb{position:absolute;inset:0;}.wd4-youtube-facade__thumb img{width:100%;height:100%;object-fit:cover;display:block;}.wd4-youtube-facade__play{position:relative;z-index:2;width:68px;height:48px;background-color:rgba(0,0,0,.7);border-radius:14px;display:flex;align-items:center;justify-content:center;transition:transform .2s ease,background-color .2s ease;}.wd4-youtube-facade__play::before{content:"";display:block;margin-left:4px;border-style:solid;border-width:12px 0 12px 18px;border-color:transparent transparent transparent #fff;}.wd4-youtube-facade__trigger:hover .wd4-youtube-facade__play,.wd4-youtube-facade__trigger:focus .wd4-youtube-facade__play{background-color:#ff184e;transform:scale(1.05);}.wd4-youtube-facade.is-active .wd4-youtube-facade__inner::before{display:none;}.wd4-youtube-facade__iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}';

    printf( "<style id='wd4-youtube-facade'>%s</style>\n", $css );
}
add_action( 'wp_head', 'wd4_output_youtube_facade_styles', 60 );

function wd4_output_youtube_facade_script(): void {
    if ( ! wd4_has_youtube_facade() ) {
        return;
    }

    $script = <<<'JS'
(function(){
"use strict";
var init=function(){
    var containers=document.querySelectorAll('.wd4-youtube-facade');
    if(!containers.length){
        return;
    }
    containers.forEach(function(container){
        var trigger=container.querySelector('.wd4-youtube-facade__trigger');
        var inner=container.querySelector('.wd4-youtube-facade__inner');
        var videoId=container.getAttribute('data-youtube-id');
        if(!trigger||!inner||!videoId){
            return;
        }
        var activated=false;
        var title=container.getAttribute('data-youtube-title')||'YouTube video';
        var params=container.getAttribute('data-youtube-params')||'autoplay=1&rel=0';
        var activate=function(){
            if(activated){
                return;
            }
            activated=true;
            var iframe=document.createElement('iframe');
            iframe.className='wd4-youtube-facade__iframe';
            iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            iframe.setAttribute('allowfullscreen','');
            iframe.setAttribute('loading','lazy');
            iframe.setAttribute('title',title);
            iframe.src='https://www.youtube.com/embed/'+encodeURIComponent(videoId)+'?'+params;
            inner.innerHTML='';
            inner.appendChild(iframe);
            container.classList.add('is-active');
        };
        trigger.addEventListener('click',function(){
            activate();
        });
        trigger.addEventListener('keydown',function(event){
            if('Enter'===event.key||' '===event.key){
                event.preventDefault();
                activate();
            }
        });
    });
};
if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
}else{
    init();
}
}());
JS;

    printf( "<script id='wd4-youtube-facade'>%s</script>\n", $script );
}
add_action( 'wp_footer', 'wd4_output_youtube_facade_script', 20 );






function wd4_get_inline_styles_map(): array {
    $map = array(
        'main'         => 'css/header/main.css',
        'slider'       => 'css/header/slider.css',
        'social'       => 'css/header/social.css',
        'divider'      => 'css/header/divider.css',
        'grid'         => 'css/header/grid.css',
        'footer'       => 'css/header/footer.css',
        'catheader'    => 'css/header/catheader.css',
        'single'       => 'css/header/single/single.css',
        'sidebar'      => 'css/header/single/sidebar.css',
        'email'        => 'css/header/single/email.css',
        'download'     => 'css/header/single/download.css',
        'sharesingle'  => 'css/header/single/sharesingle.css',
        'related'      => 'css/header/single/related.css',
        'author'       => 'css/header/single/author.css',
        'comment'      => 'css/header/single/comment.css',
        'searchheader' => 'css/header/searchheader.css',
        'fixgrid'      => 'css/header/fixgrid.css',
        'login'        => 'css/login.css',
        'my-account'   => 'css/profile.css',
    );

    return (array) apply_filters( 'wd4_inline_styles_map', $map );
}

function wd4_load_inline_stylesheet( string $relative_path ): string {
    static $cache = array();

    $key = ltrim( $relative_path, '/\\' );
    if ( array_key_exists( $key, $cache ) ) {
        return $cache[ $key ];
    }

    $themes_dir = trailingslashit( dirname( get_stylesheet_directory() ) );
    $base       = wp_normalize_path( $themes_dir );
    $path       = wp_normalize_path( $themes_dir . $key );

    if ( 0 !== strpos( $path, $base ) || ! file_exists( $path ) || ! is_readable( $path ) ) {
        $cache[ $key ] = '';
        return $cache[ $key ];
    }

    $contents = file_get_contents( $path );
    if ( false === $contents ) {
        $cache[ $key ] = '';
        return $cache[ $key ];
    }

   $contents = trim( $contents );

    if ( '' !== $contents && wd4_is_frontend_request() && wd4_should_lazy_load_icon_font() ) {
        $contents = wd4_strip_ruby_icon_font_face( $contents );
    }

    $cache[ $key ] = $contents;
    return $cache[ $key ];
}

function wd4_inline_style_loader_tag( string $html, string $handle, string $href, string $media ): string {
    $map = wd4_get_inline_styles_map();
    if ( ! isset( $map[ $handle ] ) ) {
        return $html;
    }

    $css = wd4_load_inline_stylesheet( $map[ $handle ] );
    if ( '' === $css ) {
        return $html;
    }

    $media_attr = ( $media && 'all' !== $media ) ? sprintf( ' media="%s"', esc_attr( $media ) ) : '';
    return sprintf( "<style id='%s-inline'%s>%s</style>\n", esc_attr( $handle ), $media_attr, $css );
}
add_filter( 'style_loader_tag', 'wd4_inline_style_loader_tag', 5, 4 );

function wd4_get_deferred_style_handles(): array {
    $handles = array(
        'single',
        'sidebar',
        'email',
        'download',
        'sharesingle',
        'related',
        'author',
        'comment',
        'grid',
        'footer',
    );

    $inline = array_keys( wd4_get_inline_styles_map() );
    if ( $inline ) {
        $handles = array_values( array_diff( $handles, $inline ) );
    }

    return (array) apply_filters( 'wd4_deferred_style_handles', $handles );
}
function wd4_output_critical_css(): void {
    if ( ! wd4_should_defer_styles() ) {
        return;
    }

    $inline_map = wd4_get_inline_styles_map();
    if ( isset( $inline_map['main'] ) ) {
        return;
    }

    $critical_css = <<<'CSS'
:root{--g-color:#ff184e;--nav-bg:#fff;--nav-bg-from:#fff;--nav-bg-to:#fff;--nav-color:#282828;--nav-height:60px;--mbnav-height:42px;--menu-fsize:17px;--menu-fweight:600;--menu-fspace:-.02em;--submenu-fsize:13px;--submenu-fweight:500;--submenu-fspace:-.02em;--shadow-7:#00000012}
html,body{margin:0;padding:0}
body{font-family:"Encode Sans Condensed",sans-serif;line-height:1.6;color:#282828;background:#fff}
ul{margin:0;padding:0;list-style:none}
a{color:inherit;text-decoration:none}
.edge-padding{padding-right:20px;padding-left:20px}
.rb-container{width:100%;max-width:1280px;margin:0 auto}
.header-wrap{position:relative}
.navbar-outer{position:relative;width:100%;z-index:110}
.navbar-wrap{position:relative;z-index:999;background:linear-gradient(to right,var(--nav-bg-from) 0%,var(--nav-bg-to) 100%)}
.navbar-inner{display:flex;align-items:stretch;justify-content:space-between;min-height:var(--nav-height);max-width:100%}
.navbar-left,.navbar-right,.navbar-center{display:flex;align-items:center}
.navbar-left{flex:1 1 auto}
.logo-wrap{display:flex;align-items:center;margin-right:20px;max-height:100%}
.logo-wrap img{display:block;max-height:var(--nav-height);width:auto;height:auto}
.main-menu{display:flex;align-items:center;flex-flow:row wrap;gap:5px;font-size:var(--menu-fsize);font-weight:var(--menu-fweight);letter-spacing:var(--menu-fspace)}
.main-menu>li{position:relative;display:flex;align-items:center}
.main-menu>li>a{display:flex;align-items:center;height:var(--nav-height);padding:0 12px;color:var(--nav-color);white-space:nowrap}
.header-mobile{display:none}
.header-mobile-wrap{position:relative;z-index:99;display:flex;flex-direction:column;background:var(--nav-bg)}
.mbnav{display:flex;align-items:center;min-height:var(--mbnav-height)}
.mobile-toggle-wrap{display:flex;align-items:stretch}
.mobile-menu-trigger{display:flex;align-items:center;padding-right:10px;cursor:pointer}
.header-mobile .navbar-right{display:flex;justify-content:flex-end}
.header-mobile .navbar-right>*{display:flex;align-items:center;height:100%;color:inherit}
.header-mobile .mobile-search-icon{margin-left:auto}
.privacy-bar{position:fixed;inset:auto auto 24px 24px;max-width:min(26rem,calc(100vw - 48px));display:none;opacity:0;pointer-events:none;z-index:2147483647;transform:translateY(10px);transition:opacity .2s ease,transform .2s ease;color:#fff}
.privacy-bar.activated{display:block;opacity:1;pointer-events:auto;transform:translateY(0)}
.privacy-inner{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-radius:7px;background:rgba(15,18,23,.92);box-shadow:0 10px 24px rgba(15,18,23,.18)}
.privacy-dismiss-btn{display:inline-flex;align-items:center;justify-content:center;min-height:2.25rem;padding:0 1.4rem;border-radius:999px;border:0;background:var(--g-color);color:#fff;font-weight:600}
@media (max-width:1024px){.navbar-wrap{display:none}.header-mobile{display:flex}}
@media (max-width:640px){.privacy-bar{inset:auto 16px 16px 16px;max-width:calc(100vw - 32px)}.privacy-inner{flex-direction:column;align-items:stretch;text-align:center;gap:.65rem}.privacy-dismiss-btn{width:100%}}
CSS;

    $critical_css = preg_replace( '/\s+/', ' ', trim( $critical_css ) );
    if ( $critical_css ) {
        printf( "<style id='wd4-critical-css'>%s</style>\n", $critical_css );
    }
}
add_action( 'wp_head', 'wd4_output_critical_css', 20 );

function wd4_bootstrap_adsense_heights(): void {
    if ( is_admin() || is_feed() ) {
        return;
    }
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return;
    }

    $header_enabled  = function_exists( 'wd4_is_header_ad_enabled' ) ? wd4_is_header_ad_enabled() : true;
    $article_enabled = function_exists( 'wd4_is_article_ads_enabled' ) ? wd4_is_article_ads_enabled() : true;

    if ( ! $header_enabled && ! $article_enabled ) {
        return;
    }

    $script = <<<'JS'
(function (win, doc) {
    'use strict';
    var root = doc && doc.documentElement;
    if (!root) {
        return;
    }
    var apply = function (name, value) {
        if (!value || value <= 0) {
            return;
        }
        root.style.setProperty(name, value + 'px');
    };
    try {
        var store = win.localStorage;
        if (!store) {
            return;
        }
        var raw = store.getItem('wd4AdSlotHeights');
        if (!raw) {
            return;
        }
        var data = JSON.parse(raw);
        if (!data || typeof data !== 'object') {
            return;
        }
        __HEADER_BLOCK__
        __ARTICLE_BLOCK__
    } catch (err) {}
})(window, document);
JS;

    $script = strtr(
        $script,
        array(
            '__HEADER_BLOCK__'  => $header_enabled ? "if (data.header) {\n        apply('--wd4-header-ad-height', data.header);\n    }\n" : '',
            '__ARTICLE_BLOCK__' => $article_enabled ? "if (data.share) {\n        apply('--wd4-share-ad-height', data.share);\n    }\n" : '',
        )
    );

    printf( "<script>%s</script>\n", $script );
}
add_action( 'wp_head', 'wd4_bootstrap_adsense_heights', 6 );

function wd4_filter_style_loader_tag( string $html, string $handle, string $href, string $media ): string {
    if ( ! wd4_should_defer_styles() ) {
        return $html;
    }

    $deferred = wd4_get_deferred_style_handles();
    if ( ! in_array( $handle, $deferred, true ) ) {
        return $html;
    }

    $media_attribute = ( $media && 'all' !== $media ) ? $media : '';

    global $wd4_deferred_styles_registry;
    if ( ! is_array( $wd4_deferred_styles_registry ) ) {
        $wd4_deferred_styles_registry = array();
    }

    $wd4_deferred_styles_registry[ $handle ] = array(
        'href'  => $href,
        'media' => $media_attribute,
    );

    $data_media = $media_attribute ? sprintf( ' data-media="%s"', esc_attr( $media_attribute ) ) : '';

    return sprintf(
        '<link rel="preload" as="style" data-defer-style id="%1$s" href="%2$s"%3$s />',
        esc_attr( $handle ),
        esc_url( $href ),
        $data_media
    );
}
add_filter( 'style_loader_tag', 'wd4_filter_style_loader_tag', 20, 4 );

function wd4_output_deferred_styles_noscript(): void {
    if ( ! wd4_should_defer_styles() ) {
        return;
    }

    global $wd4_deferred_styles_registry;
    if ( empty( $wd4_deferred_styles_registry ) ) {
        return;
    }

    echo "<noscript>\n";
    foreach ( $wd4_deferred_styles_registry as $handle => $data ) {
        $href  = esc_url( $data['href'] );
        $media = ! empty( $data['media'] ) ? sprintf( ' media="%s"', esc_attr( $data['media'] ) ) : ' media="all"';
        printf( "    <link rel='stylesheet' id='%1$s' href='%2$s'%3$s />\n", esc_attr( $handle ), $href, $media );
    }
    echo "</noscript>\n";
}
add_action( 'wp_head', 'wd4_output_deferred_styles_noscript', 110 );

function wd4_enqueue_defer_css_script(): void {
    if ( ! wd4_should_defer_styles() ) {
        return;
    }

    $script_handle = 'wd-defer-css';
    $script_src    = get_stylesheet_directory_uri() . '/js/defer-css.js';

    wp_enqueue_script( $script_handle, $script_src, array(), '1.0.0', true );

    if ( function_exists( 'wp_script_add_data' ) ) {
        wp_script_add_data( $script_handle, 'strategy', 'defer' );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_enqueue_defer_css_script', 200 );




/**
 * -------------------------------------------------------------------------
 * Archive and listing DOM optimizations
 * -------------------------------------------------------------------------
 */
function wd4_should_minimize_loop_dom(): bool {
    if ( ! wd4_is_frontend_request() ) {
        return false;
    }

    if ( is_feed() || is_404() ) {
        return false;
    }

    if ( is_singular() ) {
        return false;
    }

    if ( ! ( is_home() || is_archive() || is_search() ) ) {
        return false;
    }

    $post_type = get_post_type();
    if ( $post_type && 'post' !== $post_type ) {
        return false;
    }

    return (bool) apply_filters( 'wd4_minimize_loop_dom', true );
}

function wd4_normalize_summary_source( string $content ): string {
    $excerpt = get_the_excerpt();
    if ( is_string( $excerpt ) ) {
        $excerpt = trim( $excerpt );
    } else {
        $excerpt = '';
    }

    if ( '' === $excerpt ) {
        $excerpt = $content;
    }

    $excerpt = strip_shortcodes( $excerpt );
    $excerpt = wp_strip_all_tags( $excerpt, true );
    $excerpt = preg_replace( '/\s+/u', ' ', $excerpt );
    $excerpt = is_string( $excerpt ) ? trim( $excerpt ) : '';

    return $excerpt;
}

function wd4_generate_loop_summary( string $content ): string {
    static $cache = array();

    $post_id = get_the_ID();
    if ( $post_id && isset( $cache[ $post_id ] ) ) {
        return $cache[ $post_id ];
    }

    $summary = wd4_normalize_summary_source( $content );

    if ( '' === $summary ) {
        if ( $post_id ) {
            $cache[ $post_id ] = '';
        }

        return '';
    }

    $word_limit = (int) apply_filters( 'wd4_loop_summary_word_count', 55, $post_id );
    if ( $word_limit > 0 ) {
        $summary = wp_trim_words( $summary, $word_limit, '&hellip;' );
    }

    $summary = esc_html( $summary );

    if ( $post_id && apply_filters( 'wd4_loop_summary_append_read_more', true, $post_id ) ) {
        $permalink = get_permalink( $post_id );
        if ( $permalink ) {
            $summary .= sprintf(
                ' <a class="wd4-archive-summary__more" href="%s">%s</a>',
                esc_url( $permalink ),
                esc_html__( 'Read more', 'foxiz-child' )
            );
        }
    }

    if ( $post_id ) {
        $cache[ $post_id ] = $summary;
    }

    return $summary;
}

function wd4_reduce_loop_dom( string $content ): string {
    if ( '' === $content ) {
        return $content;
    }

    if ( ! in_the_loop() || ! is_main_query() ) {
        return $content;
    }

    if ( post_password_required() ) {
        return $content;
    }

    if ( ! wd4_should_minimize_loop_dom() ) {
        return $content;
    }

    $summary = wd4_generate_loop_summary( $content );

    return '' !== $summary ? $summary : $content;
}
add_filter( 'the_content', 'wd4_reduce_loop_dom', 5 );

function wd4_limit_archive_excerpt_length( int $length ): int {
    if ( ! wd4_should_minimize_loop_dom() ) {
        return $length;
    }

    $preferred = (int) apply_filters( 'wd4_archive_excerpt_length', 32 );

    return $preferred > 0 ? $preferred : $length;
}
add_filter( 'excerpt_length', 'wd4_limit_archive_excerpt_length', 999 );


/**
 * -------------------------------------------------------------------------
 * Head cleanup and payload reduction
 * -------------------------------------------------------------------------
 */
function wd4_disable_emojis(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
    remove_action( 'wp_print_styles', 'print_emoji_styles' );
    remove_action( 'wp_print_footer_scripts', 'print_emoji_detection_script' );
    remove_action( 'embed_head', 'print_emoji_detection_script' );
    remove_action( 'embed_print_styles', 'print_emoji_styles' );

    remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
    remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
    remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );

    add_filter( 'emoji_svg_url', '__return_false' );
    add_filter( 'option_use_smilies', 'wd4_filter_disable_emojis_option' );
}
add_action( 'init', 'wd4_disable_emojis', 5 );

function wd4_filter_disable_emojis_option(): string {
    return '0';
}

function wd4_disable_emojis_tinymce( $plugins ) {
    if ( ! wd4_is_frontend_request() ) {
        return $plugins;
    }

    if ( ! is_array( $plugins ) ) {
        return $plugins;
    }

    return array_diff( $plugins, array( 'wpemoji' ) );
}
add_filter( 'tiny_mce_plugins', 'wd4_disable_emojis_tinymce' );

function wd4_remove_emoji_dns_prefetch( array $urls, string $relation_type ): array {
    if ( 'dns-prefetch' !== $relation_type ) {
        return $urls;
    }

    if ( ! wd4_is_frontend_request() ) {
        return $urls;
    }

    $filtered = array();

    foreach ( $urls as $url ) {
        $href = wd4_get_hint_href( $url );

        if ( '' === $href || false === strpos( $href, 's.w.org' ) ) {
            $filtered[] = $url;
        }
    }

    return $filtered;
}
add_filter( 'wp_resource_hints', 'wd4_remove_emoji_dns_prefetch', 9, 2 );

function wd4_cleanup_head_links(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    $targets = apply_filters(
        'wd4_head_cleanup_actions',
        array(
            array( 'wp_head', 'feed_links_extra', 3 ),
            array( 'wp_head', 'feed_links', 2 ),
            array( 'wp_head', 'rsd_link', 10 ),
            array( 'wp_head', 'wlwmanifest_link', 10 ),
            array( 'wp_head', 'wp_generator', 10 ),
            array( 'wp_head', 'wp_shortlink_wp_head', 10 ),
            array( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 ),
        )
    );

    foreach ( $targets as $target ) {
        if ( ! is_array( $target ) || count( $target ) < 2 ) {
            continue;
        }

        $hook     = $target[0];
        $callback = $target[1];
        $priority = $target[2] ?? 10;
        $args     = $target[3] ?? 0;

        remove_action( $hook, $callback, $priority, $args );
    }
}
add_action( 'init', 'wd4_cleanup_head_links', 8 );

function wd4_disable_wp_embed(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    if ( ! apply_filters( 'wd4_disable_wp_embed', true ) ) {
        return;
    }

    remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
    remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
    remove_action( 'template_redirect', 'rest_output_link_header', 11 );
    remove_action( 'wp_head', 'wp_oembed_add_host_js' );

    add_action( 'wp_enqueue_scripts', 'wd4_deregister_wp_embed', 100 );
}
add_action( 'init', 'wd4_disable_wp_embed', 9 );

function wd4_deregister_wp_embed(): void {
    wp_deregister_script( 'wp-embed' );
}

function wd4_get_hint_href( $hint ): string {
    if ( is_array( $hint ) && isset( $hint['href'] ) ) {
        return trim( (string) $hint['href'] );
    }

    if ( is_string( $hint ) ) {
        return trim( $hint );
    }

    return '';
}

function wd4_extract_origin( string $url ): string {
    $parts = wp_parse_url( $url );

    if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
        return '';
    }

    $origin = strtolower( $parts['scheme'] . '://' . $parts['host'] );

    if ( isset( $parts['port'] ) ) {
        $origin .= ':' . $parts['port'];
    }

    return $origin;
}

function wd4_normalize_resource_hint_entry( $entry ): array {
    if ( is_array( $entry ) ) {
        $href = wd4_get_hint_href( $entry );
        if ( '' === $href ) {
            return array();
        }

        $normalized = array( 'href' => $href );

        if ( isset( $entry['as'] ) ) {
            $as = trim( (string) $entry['as'] );
            if ( '' !== $as ) {
                $normalized['as'] = $as;
            }
        }

        if ( isset( $entry['type'] ) ) {
            $type = trim( (string) $entry['type'] );
            if ( '' !== $type ) {
                $normalized['type'] = $type;
            }
        }

        if ( isset( $entry['crossorigin'] ) ) {
            $crossorigin = strtolower( trim( (string) $entry['crossorigin'] ) );
            if ( in_array( $crossorigin, array( 'anonymous', 'use-credentials' ), true ) ) {
                $normalized['crossorigin'] = $crossorigin;
            }
        }

        return $normalized;
    }

    $href = wd4_get_hint_href( $entry );
    if ( '' === $href ) {
        return array();
    }

    return array( 'href' => $href );
}

function wd4_merge_resource_hints( array $urls, array $candidates ): array {
    if ( empty( $candidates ) ) {
        return $urls;
    }

    $known = array();
    foreach ( $urls as $url ) {
        $href = wd4_get_hint_href( $url );
        if ( '' !== $href ) {
            $known[ $href ] = true;
        }
    }

    foreach ( $candidates as $candidate ) {
        $entry = wd4_normalize_resource_hint_entry( $candidate );
        if ( empty( $entry['href'] ) ) {
            continue;
        }

        if ( isset( $known[ $entry['href'] ] ) ) {
            continue;
        }

        $known[ $entry['href'] ] = true;

        if ( 1 === count( $entry ) ) {
            $urls[] = $entry['href'];
        } else {
            $urls[] = $entry;
        }
    }

    return $urls;
}

function wd4_filter_out_resource_hints( array $urls, array $candidates ): array {
    if ( empty( $urls ) || empty( $candidates ) ) {
        return $urls;
    }

    $remove = array();
    foreach ( $candidates as $candidate ) {
        $entry = wd4_normalize_resource_hint_entry( $candidate );
        if ( empty( $entry['href'] ) ) {
            continue;
        }

        $remove[ $entry['href'] ] = true;
    }

    if ( empty( $remove ) ) {
        return $urls;
    }

    $filtered = array();
    foreach ( $urls as $url ) {
        $href = wd4_get_hint_href( $url );
        if ( '' !== $href && isset( $remove[ $href ] ) ) {
            continue;
        }

        $filtered[] = $url;
    }

    return $filtered;
}

function wd4_get_icon_font_url(): string {
    $url = 'https://aistudynow.com/wp-content/themes/foxiz/assets/fonts/icons.woff2?ver=2.5.0';

    /**
     * Allow customization of the icon font preload URL.
     */
    return (string) apply_filters( 'wd4_icon_font_url', $url );
}

function wd4_should_lazy_load_icon_font(): bool {
    $default = true;

    if ( is_admin() ) {
        $default = false;
    } elseif ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        $default = false;
    } elseif ( function_exists( 'is_customize_preview' ) && is_customize_preview() ) {
        $default = false;
    }

    return (bool) apply_filters( 'wd4_lazy_icon_font', $default );
}

function wd4_strip_ruby_icon_font_face( string $css ): string {
    if ( '' === $css || false === stripos( $css, 'ruby-icon' ) ) {
        return $css;
    }

    $pattern = '#@font-face\s*\{[^{}]*?font-family\s*:\s*(?:"|\')ruby-icon(?:"|\')[^{}]*\}#i';
    $cleaned = preg_replace( $pattern, '', $css );

    if ( null === $cleaned ) {
        return $css;
    }

    return trim( $cleaned );
}

function wd4_get_icon_font_face_css( string $url ): string {
    if ( '' === $url ) {
        return '';
    }

    $css = sprintf(
        "@font-face{font-family:'ruby-icon';font-style:normal;font-weight:400;font-display:swap;src:url('%s') format('woff2');}",
        esc_url_raw( $url )
    );

    /**
     * Filter the inline @font-face declaration used by the lazy loader.
     */
    return (string) apply_filters( 'wd4_icon_font_face_css', $css, $url );
}

function wd4_should_preload_icon_font(): bool {
    $default = wd4_should_lazy_load_icon_font() ? false : true;

    return (bool) apply_filters( 'wd4_preload_icon_font', $default );
}

function wd4_output_icon_font_preload(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    if ( wd4_should_lazy_load_icon_font() ) {
        return;
    }

    if ( ! wd4_should_preload_icon_font() ) {
        return;
    }

    $href = trim( wd4_get_icon_font_url() );
    if ( '' === $href ) {
        return;
    }

    $home_origin   = wd4_extract_origin( home_url( '/' ) );
    $font_origin   = wd4_extract_origin( $href );
    $needs_cross   = $font_origin && $font_origin !== $home_origin;
    $cross_attr    = $needs_cross ? " crossorigin='anonymous'" : '';
    $preload_attrs = sprintf(
        " rel='preload' href='%s' as='font' type='font/woff2'%s fetchpriority='low'",
        esc_url( $href ),
        $cross_attr
    );

    printf( '<link%s>%s', $preload_attrs, "\n" );
}
add_action( 'wp_head', 'wd4_output_icon_font_preload', 4 );

function wd4_enqueue_lazy_loader_script(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    if ( ! wd4_should_lazy_load_icon_font() ) {
        return;
    }

    $href = trim( wd4_get_icon_font_url() );
    if ( '' === $href ) {
        return;
    }

    

$handle = 'wd4-lazy-loader';
    $src    = trailingslashit( get_stylesheet_directory_uri() ) . 'js/lazy.js';
    $path   = trailingslashit( get_stylesheet_directory() ) . 'js/lazy.js';
    $ver    = file_exists( $path ) ? (string) filemtime( $path ) : null;

    wp_register_script( $handle, $src, array(), $ver, true );

    $config = array(
        'iconFontUrl'    => esc_url_raw( $href ),
        'iconFontFamily' => 'ruby-icon',
        'styleId'        => 'wd4-icon-font-face',
        'timeout'        => 1200,
        'fallbackDelay'  => 120,
    );

    wp_localize_script( $handle, 'wd4LazyLoader', $config );
    wp_enqueue_script( $handle );
}
add_action( 'wp_enqueue_scripts', 'wd4_enqueue_lazy_loader_script', 200 );



    

function wd4_output_icon_font_noscript(): void {
    if ( ! wd4_is_frontend_request() ) {
        return;
    }

    if ( ! wd4_should_lazy_load_icon_font() ) {
        return;
    }

    $href = trim( wd4_get_icon_font_url() );
    if ( '' === $href ) {
        return;
    }

    $font_face = wd4_get_icon_font_face_css( $href );
    if ( '' === $font_face ) {
        return;
    }

    printf( "<noscript id='wd4-icon-font-fallback'><style>%s</style></noscript>\n", $font_face );
}
add_action( 'wp_footer', 'wd4_output_icon_font_noscript', 6 );

function wd4_collect_preconnect_origins(): array {
    static $cache = null;

    if ( null !== $cache ) {
        return $cache;
    }

    if ( is_admin() || is_feed() ) {
        $cache = array();
        return $cache;
    }

    if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        $cache = array();
        return $cache;
    }

    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        $cache = array();
        return $cache;
    }

    $origins     = array();
    $home_origin = wd4_extract_origin( home_url( '/' ) );

    if ( $home_origin ) {
        $origins[] = $home_origin;
    }

    $ads_enabled = function_exists( 'wd4_are_ads_enabled' ) ? wd4_are_ads_enabled() : true;

    if ( $ads_enabled ) {
        $origins[] = array(
            'href'        => 'https://pagead2.googlesyndication.com',
            'crossorigin' => 'anonymous',
        );
        $origins[] = array(
            'href'        => 'https://googleads.g.doubleclick.net',
            'crossorigin' => 'anonymous',
        );
        $origins[] = array(
            'href'        => 'https://securepubads.g.doubleclick.net',
            'crossorigin' => 'anonymous',
        );
        $origins[] = array(
            'href'        => 'https://imasdk.googleapis.com',
            'crossorigin' => 'anonymous',
        );
    }

    if ( is_singular( array( 'post', 'page' ) ) ) {
        $origins[] = array(
            'href'        => 'https://a.vdo.ai',
            'crossorigin' => 'anonymous',
        );
        $origins[] = array(
            'href'        => 'https://targeting.vdo.ai',
            'crossorigin' => 'anonymous',
        );
    }

    $origins[] = 'https://fonts.googleapis.com';
    $origins[] = array(
        'href'        => 'https://fonts.gstatic.com',
        'crossorigin' => 'anonymous',
    );

    if ( wd4_should_defer_styles() ) {
        $origins[] = 'https://cloudflare.com';
    }

    $icon_font_url    = wd4_get_icon_font_url();
    $icon_font_origin = $icon_font_url ? wd4_extract_origin( $icon_font_url ) : '';

    if ( $icon_font_origin ) {
        if ( $icon_font_origin === $home_origin ) {
            $origins[] = $icon_font_origin;
        } else {
            $origins[] = array(
                'href'        => $icon_font_origin,
                'crossorigin' => 'anonymous',
            );
        }
    }

    $origins = apply_filters( 'wd4_preconnect_origins', $origins );

    $normalized = array();
    foreach ( (array) $origins as $origin ) {
        $entry = wd4_normalize_resource_hint_entry( $origin );
        if ( empty( $entry['href'] ) ) {
            continue;
        }

        $normalized[ $entry['href'] ] = $entry;
    }

    $cache = array_values( $normalized );

    return $cache;
}

function wd4_output_preconnect_links(): void {
    $origins = wd4_collect_preconnect_origins();

    if ( empty( $origins ) ) {
        return;
    }

    foreach ( $origins as $origin ) {
        $href        = $origin['href'];
        $crossorigin = isset( $origin['crossorigin'] ) ? sprintf( " crossorigin='%s'", esc_attr( $origin['crossorigin'] ) ) : '';

        printf( "<link rel='preconnect' href='%s'%s>\n", esc_url( $href ), $crossorigin );
    }
}
add_action( 'wp_head', 'wd4_output_preconnect_links', 3 );

function wd4_add_resource_hints( array $urls, string $relation_type ): array {
    if ( is_admin() ) {
        return $urls;
    }

    if ( is_feed() ) {
        return $urls;
    }

    if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        return $urls;
    }

    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return $urls;
    }

    if ( 'preconnect' === $relation_type ) {
        $urls = wd4_filter_out_resource_hints( $urls, wd4_collect_preconnect_origins() );
    }

    if ( 'preload' === $relation_type ) {
        $urls = wd4_filter_out_resource_hints( $urls, array( wd4_get_icon_font_url() ) );
    }

    return $urls;
}
add_filter( 'wp_resource_hints', 'wd4_add_resource_hints', 10, 2 );







/**
 * -------------------------------------------------------------------------
 * Ad visibility toggles and helpers
 * -------------------------------------------------------------------------
 */
function wd4_is_header_ad_enabled(): bool {
    $enabled = get_option( 'wd4_enable_header_ad', '1' );
    return (bool) apply_filters( 'wd4_is_header_ad_enabled', (bool) $enabled );
}

function wd4_is_article_ads_enabled(): bool {
    $enabled = get_option( 'wd4_enable_article_ads', '1' );
    return (bool) apply_filters( 'wd4_is_article_ads_enabled', (bool) $enabled );
}

function wd4_are_ads_enabled(): bool {
    return wd4_is_header_ad_enabled() || wd4_is_article_ads_enabled();
}

function wd4_ads_checkbox_sanitize( $value ): string {
    return $value ? '1' : '0';
}

function wd4_ads_settings_init(): void {
    if ( ! is_admin() ) {
        return;
    }

    register_setting(
        'wd4_ads_settings',
        'wd4_enable_header_ad',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'wd4_ads_checkbox_sanitize',
            'default'           => '1',
        )
    );

    register_setting(
        'wd4_ads_settings',
        'wd4_enable_article_ads',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'wd4_ads_checkbox_sanitize',
            'default'           => '1',
        )
    );

    add_settings_section( 'wd4_ads_visibility_section', __( 'Ad Visibility', 'foxiz-child' ), '__return_false', 'wd4-ad-visibility' );
    add_settings_field( 'wd4_enable_header_ad', __( 'Header Ad', 'foxiz-child' ), 'wd4_render_header_ad_field', 'wd4-ad-visibility', 'wd4_ads_visibility_section' );
    add_settings_field( 'wd4_enable_article_ads', __( 'Article Ads', 'foxiz-child' ), 'wd4_render_article_ads_field', 'wd4-ad-visibility', 'wd4_ads_visibility_section' );
}
add_action( 'admin_init', 'wd4_ads_settings_init' );

function wd4_ads_settings_menu(): void {
    add_options_page( __( 'Ad Visibility', 'foxiz-child' ), __( 'Ad Visibility', 'foxiz-child' ), 'manage_options', 'wd4-ad-visibility', 'wd4_render_ads_settings_page' );
}
add_action( 'admin_menu', 'wd4_ads_settings_menu' );

function wd4_render_header_ad_field(): void {
    $enabled = wd4_is_header_ad_enabled();
    printf( '<label><input type="checkbox" name="wd4_enable_header_ad" value="1" %1$s /> %2$s</label>', checked( $enabled, true, false ), esc_html__( 'Display the injected header advertisement slot.', 'foxiz-child' ) );
}

function wd4_render_article_ads_field(): void {
    $enabled = wd4_is_article_ads_enabled();
    printf( '<label><input type="checkbox" name="wd4_enable_article_ads" value="1" %1$s /> %2$s</label>', checked( $enabled, true, false ), esc_html__( 'Display in-article placements, including the below-share slot.', 'foxiz-child' ) );
}

function wd4_render_ads_settings_page(): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'Ad Visibility', 'foxiz-child' ); ?></h1>
        <?php settings_errors( 'wd4_ads_settings' ); ?>
        <form action="options.php" method="post">
            <?php
            settings_fields( 'wd4_ads_settings' );
            do_settings_sections( 'wd4-ad-visibility' );
            submit_button();
            ?>
        </form>
    </div>
    <?php
}

function wd4_handle_ad_toggle_request( string $option, string $nonce_action ): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'You are not allowed to toggle ads.', 'foxiz-child' ) );
    }

    check_admin_referer( $nonce_action );

    $state = ( isset( $_GET['state'] ) && '0' === $_GET['state'] ) ? '0' : '1';
    update_option( $option, $state );

    $redirect = wp_get_referer();
    if ( ! $redirect ) {
        $redirect = admin_url( 'options-general.php?page=wd4-ad-visibility' );
    }

    wp_safe_redirect( $redirect );
    exit;
}

function wd4_handle_header_ad_toggle(): void {
    wd4_handle_ad_toggle_request( 'wd4_enable_header_ad', 'wd4-toggle-header-ad' );
}
add_action( 'admin_post_wd4_toggle_header_ad', 'wd4_handle_header_ad_toggle' );

function wd4_handle_article_ads_toggle(): void {
    wd4_handle_ad_toggle_request( 'wd4_enable_article_ads', 'wd4-toggle-article-ads' );
}
add_action( 'admin_post_wd4_toggle_article_ads', 'wd4_handle_article_ads_toggle' );

function wd4_ads_toolbar_switches( WP_Admin_Bar $wp_admin_bar ): void {
    if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $parent_id = 'wd4-ads-visibility';

    $wp_admin_bar->add_node( array(
        'id'    => $parent_id,
        'title' => esc_html__( 'Ad Visibility', 'foxiz-child' ),
        'href'  => admin_url( 'options-general.php?page=wd4-ad-visibility' ),
    ) );

    $header_enabled  = wd4_is_header_ad_enabled();
    $article_enabled = wd4_is_article_ads_enabled();

    $header_url = wp_nonce_url(
        add_query_arg(
            array(
                'action' => 'wd4_toggle_header_ad',
                'state'  => $header_enabled ? '0' : '1',
            ),
            admin_url( 'admin-post.php' )
        ),
        'wd4-toggle-header-ad'
    );

    $article_url = wp_nonce_url(
        add_query_arg(
            array(
                'action' => 'wd4_toggle_article_ads',
                'state'  => $article_enabled ? '0' : '1',
            ),
            admin_url( 'admin-post.php' )
        ),
        'wd4-toggle-article-ads'
    );

    $wp_admin_bar->add_node( array(
        'id'     => $parent_id . '-header',
        'parent' => $parent_id,
        'title'  => $header_enabled ? esc_html__( 'Turn Header Ad Off', 'foxiz-child' ) : esc_html__( 'Turn Header Ad On', 'foxiz-child' ),
        'href'   => $header_url,
    ) );

    $wp_admin_bar->add_node( array(
        'id'     => $parent_id . '-article',
        'parent' => $parent_id,
        'title'  => $article_enabled ? esc_html__( 'Turn Article Ads Off', 'foxiz-child' ) : esc_html__( 'Turn Article Ads On', 'foxiz-child' ),
        'href'   => $article_url,
    ) );
}
add_action( 'admin_bar_menu', 'wd4_ads_toolbar_switches', 80 );
/**
 * -------------------------------------------------------------------------
 * Theme stylesheet helpers
 * -------------------------------------------------------------------------
 */
function wd4_kill_foxiz_css(): void {
    foreach ( array( 'foxiz-main-css', 'foxiz-main', 'foxiz-style', 'foxiz-global' ) as $handle ) {
        wp_dequeue_style( $handle );
        wp_deregister_style( $handle );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_kill_foxiz_css', 1000 );

defined( 'WD_LOGIN_PAGE_ID' ) || define( 'WD_LOGIN_PAGE_ID', 0 );

function wd4_is_front_login_page(): bool {
    if ( WD_LOGIN_PAGE_ID ) {
        return is_page( WD_LOGIN_PAGE_ID );
    }
    return is_page( 'login-3' );
}

function wd4_enqueue_styles(): void {
    $is_login   = wd4_is_front_login_page();
    $is_account = function_exists( 'is_account_page' ) && is_account_page();

    if ( is_front_page() || is_home() ) {
        wp_enqueue_style( 'main',    'https://aistudynow.com/wp-content/themes/css/header/main.css',   array(), '7565677766876655777999980.0' );
        wp_enqueue_style( 'slider',  'https://aistudynow.com/wp-content/themes/css/header/slider.css', array(), '6678576655777999980.0' );
        wp_enqueue_style( 'social',  'https://aistudynow.com/wp-content/themes/css/header/social.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'divider', 'https://aistudynow.com/wp-content/themes/css/header/divider.css', array(), '66997876655777999980.0' );
        wp_enqueue_style( 'grid',    'https://aistudynow.com/wp-content/themes/css/header/grid.css',   array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',  'https://aistudynow.com/wp-content/themes/css/header/footer.css', array(), '667876655777999980.0' );
    }

    if ( is_category() ) {
        wp_enqueue_style( 'main',      'https://aistudynow.com/wp-content/themes/css/header/main.css',      array(), '7667876655777999980.0' );
        wp_enqueue_style( 'catheader', 'https://aistudynow.com/wp-content/themes/css/header/catheader.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',      'https://aistudynow.com/wp-content/themes/css/header/grid.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',    'https://aistudynow.com/wp-content/themes/css/header/footer.css',    array(), '667876655777999980.0' );
    }

    if ( is_singular( 'post' ) ) {
        wp_enqueue_style( 'main',        'https://aistudynow.com/wp-content/themes/css/header/main.css',               array(), '77779999880.0' );
        wp_enqueue_style( 'single',      'https://aistudynow.com/wp-content/themes/css/header/single/single.css',      array(), '87667876655777999980.0' );
        wp_enqueue_style( 'sidebar',     'https://aistudynow.com/wp-content/themes/css/header/single/sidebar.css',     array(), '667876655777999980.0' );
        wp_enqueue_style( 'email',       'https://aistudynow.com/wp-content/themes/css/header/single/email.css',       array(), '667876655777999980.0' );
        wp_enqueue_style( 'download',    'https://aistudynow.com/wp-content/themes/css/header/single/download.css',    array(), '667876655777999980.0' );
        wp_enqueue_style( 'sharesingle', 'https://aistudynow.com/wp-content/themes/css/header/single/sharesingle.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'related',     'https://aistudynow.com/wp-content/themes/css/header/single/related.css',     array(), '667876655777999980.0' );
        wp_enqueue_style( 'author',      'https://aistudynow.com/wp-content/themes/css/header/single/author.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'comment',     'https://aistudynow.com/wp-content/themes/css/header/single/comment.css',     array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',        'https://aistudynow.com/wp-content/themes/css/header/grid.css',               array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',      'https://aistudynow.com/wp-content/themes/css/header/footer.css',             array(), '667876655777999980.0' );
    }

    if ( $is_login ) {
        wp_enqueue_style( 'login', 'https://aistudynow.com/wp-content/themes/css/login.css', array(), '974777977.2.0' );
    }

    if ( is_search() ) {
        wp_enqueue_style( 'main',         'https://aistudynow.com/wp-content/themes/css/header/main.css',        array(), '667876655777999980.0' );
        wp_enqueue_style( 'searchheader', 'https://aistudynow.com/wp-content/themes/css/header/searchheader.css', array(), '667876655777999980.0' );
        wp_enqueue_style( 'grid',         'https://aistudynow.com/wp-content/themes/css/header/grid.css',         array(), '667876655777999980.0' );
        wp_enqueue_style( 'fixgrid',      'https://aistudynow.com/wp-content/themes/css/header/fixgrid.css',      array(), '667876655777999980.0' );
        wp_enqueue_style( 'footer',       'https://aistudynow.com/wp-content/themes/css/header/footer.css',       array(), '667876655777999980.0' );
    }

    if ( $is_account ) {
        wp_enqueue_style( 'my-account', 'https://aistudynow.com/wp-content/themes/css/profile.css', array(), '1.80.0' );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_enqueue_styles', 20 );

function wd4_prune_styles(): void {
    if ( is_admin() || wd4_is_front_login_page() || is_search() ) {
        return;
    }

    if ( ! ( is_front_page() || is_home() || is_category() || is_singular( 'post' ) ) ) {
        return;
    }

    global $wp_styles;
    if ( ! ( $wp_styles instanceof WP_Styles ) ) {
        return;
    }

    $allowed = array(
        'main','cat','login','search','single',
        'slider','pro-crusal','fixgrid','crusal','searchheader','front',
        'login2','header-mobile','profile','search-mobile','menu-mobile','sidebar-mobile',
        'divider','footer','grid','social','catheader','sidebar','related','email','download','sharesingle','author','comment',
        'dashicons','style','theme-style','foxiz-style',
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

add_action( 'login_enqueue_scripts', function (): void {
    wp_enqueue_style( 'login', 'https://aistudynow.com/wp-content/themes/css/login.css', array(), '97488777977.2.0' );
} );




/**
 * -------------------------------------------------------------------------
 * In-article AdSense helpers
 * -------------------------------------------------------------------------
 */
if ( ! defined( 'ASN_INARTICLE_SLOTS' ) ) {
    define( 'ASN_INARTICLE_SLOTS', wp_json_encode( array( '1012646722', '6169550738', '2230305722', '2481641061' ) ) );
}

function asn_build_inarticle_ad( string $id, string $slot ): string {
    return sprintf(
        '<div id="%1$s" class="ad-wrap ad-inarticle" style="min-height:280px;margin:24px 0"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9101284402640935" data-ad-slot="%2$s" data-ad-format="auto" data-full-width-responsive="true"></ins></div>',
        esc_attr( $id ),
        esc_attr( $slot )
    );
}

function asn_choose_positions( int $para_count ): array {
    if ( $para_count <= 1 ) {
        return array();
    }

    $max_idx = max( 1, $para_count - 1 );

    if ( $para_count <= 4 ) {
        $base = array( 2 );
    } elseif ( $para_count <= 7 ) {
        $base = array( 2, 5 );
    } elseif ( $para_count <= 12 ) {
        $base = array( 2, 5, 9 );
    } else {
        $base = array( 2, 5, 9, 12 );
    }

    $filtered = array();
    $prev     = 0;

    foreach ( $base as $position ) {
        if ( $position <= $max_idx && ( empty( $filtered ) || ( $position - $prev ) >= 2 ) ) {
            $filtered[] = $position;
            $prev       = $position;
        }
    }

    return $filtered;
}

function asn_insert_dynamic_inarticle_ads( string $content ): string {
    if ( ! wd4_is_article_ads_enabled() ) {
        return $content;
    }

    if ( is_admin() || is_feed() || is_search() || is_archive() ) {
        return $content;
    }

    if ( ! in_the_loop() || ! is_main_query() || ! is_singular( array( 'post', 'page' ) ) ) {
        return $content;
    }

    if ( false !== strpos( $content, 'class="ad-inarticle"' ) ) {
        return $content;
    }

    $parts = preg_split( '#(</p>)#i', $content, -1, PREG_SPLIT_DELIM_CAPTURE );
    if ( ! $parts || count( $parts ) < 3 ) {
        return $content;
    }

    $para_count = 0;
    for ( $i = 1; $i < count( $parts ); $i += 2 ) {
        if ( stripos( $parts[ $i ], '</p>' ) !== false ) {
            $para_count++;
        }
    }

    $positions = asn_choose_positions( $para_count );
    if ( empty( $positions ) ) {
        return $content;
    }

    $slots = json_decode( ASN_INARTICLE_SLOTS, true );
    if ( ! is_array( $slots ) || empty( $slots ) ) {
        return $content;
    }

    $out        = '';
    $para_index = 0;
    $ad_index   = 0;

    for ( $i = 0; $i < count( $parts ); $i += 2 ) {
        $p  = $parts[ $i ];
        $cl = $parts[ $i + 1 ] ?? '';

        $out .= $p;
        if ( '' !== $cl ) {
            $out        .= $cl;
            $para_index++;

            if ( in_array( $para_index, $positions, true ) && isset( $slots[ $ad_index ] ) ) {
                $out .= asn_build_inarticle_ad( 'asn-inart-' . ( $ad_index + 1 ), $slots[ $ad_index ] );
                $ad_index++;
            }

            if ( $ad_index >= count( $slots ) ) {
                for ( $j = $i + 2; $j < count( $parts ); $j++ ) {
                    $out .= $parts[ $j ];
                }
                return $out;
            }
        }
    }

    return $out;
}
add_filter( 'the_content', 'asn_insert_dynamic_inarticle_ads', 18 );

add_action( 'wp_footer', function (): void {
    if ( is_admin() ) {
        return;
    }
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return;
    }

    $header_enabled  = wd4_is_header_ad_enabled();
    $article_enabled = wd4_is_article_ads_enabled();

    if ( ! $header_enabled && ! $article_enabled ) {
        return;
    }
    ?>
    <script>
    (function (win, doc) {
        'use strict';
        if (!win || !doc) {
            return;
        }
        var enableHeader = <?php echo $header_enabled ? 'true' : 'false'; ?>;
        var enableArticle = <?php echo $article_enabled ? 'true' : 'false'; ?>;
        var renderOnce = function (ins) {
            if (!ins || ins.dataset.loaded) {
                return;
            }
            ins.dataset.loaded = '1';
            try {
                (win.adsbygoogle = win.adsbygoogle || []).push({});
            } catch (err) {}
        };
        var setupOne = function (wrap) {
            if (!wrap) {
                return;
            }
            var ins = wrap.querySelector('ins.adsbygoogle');
            if (!ins) {
                return;
            }
            var rect = wrap.getBoundingClientRect();
            var viewH = win.innerHeight || doc.documentElement.clientHeight || 0;
            if (rect.top < viewH + 120) {
                renderOnce(ins);
                return;
            }
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        renderOnce(ins);
                        io.disconnect();
                    }
                });
            }, { rootMargin: '250px 0px' });
            io.observe(wrap);
        };
        var ready = function (fn) {
            if (doc.readyState !== 'loading') {
                fn();
            } else {
                doc.addEventListener('DOMContentLoaded', fn);
            }
        };
        var storageKey = 'wd4AdSlotHeights';
        var recorded = {};
        var store = null;
        try {
            store = win.localStorage;
        } catch (err) {
            store = null;
        }
        var persist = function (slotKey, height) {
            if (!store || !slotKey || !height || height <= 0) {
                return;
            }
            var existing;
            try {
                existing = JSON.parse(store.getItem(storageKey) || '{}');
            } catch (err) {
                existing = {};
            }
            if (existing[slotKey] === height) {
                return;
            }
            existing[slotKey] = height;
            try {
                store.setItem(storageKey, JSON.stringify(existing));
            } catch (err) {}
        };
        var watchSlot = function (slotId, slotKey) {
            var wrap = doc.getElementById(slotId);
            if (!wrap) {
                return;
            }
            var ins = wrap.querySelector('ins.adsbygoogle');
            if (!ins) {
                return;
            }
            var record = function () {
                var rect = ins.getBoundingClientRect();
                var height = Math.round(rect.height);
                if (height > 0 && recorded[slotKey] !== height) {
                    recorded[slotKey] = height;
                    persist(slotKey, height);
                }
            };
            if ('ResizeObserver' in win) {
                var ro = new ResizeObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry || !entry.contentRect) {
                            return;
                        }
                        var measured = Math.round(entry.contentRect.height);
                        if (measured > 0 && recorded[slotKey] !== measured) {
                            recorded[slotKey] = measured;
                            persist(slotKey, measured);
                        }
                    });
                });
                ro.observe(ins);
            } else {
                win.addEventListener('load', record);
                win.addEventListener('resize', record);
                setTimeout(record, 2000);
            }
        };
        ready(function () {
            if (enableArticle) {
                var wraps = doc.querySelectorAll('.ad-inarticle');
                if (wraps && wraps.length) {
                    if (typeof wraps.forEach === 'function') {
                        wraps.forEach(setupOne);
                    } else {
                        for (var i = 0; i < wraps.length; i++) {
                            setupOne(wraps[i]);
                        }
                    }
                }
            }
            if (enableHeader) {
                watchSlot('asn-header-ad', 'header');
            }
            if (enableArticle) {
                watchSlot('asn-share-ad', 'share');
            }
        });
    })(window, document);
    </script>
    <?php
}, 99 );

add_action( 'wp_enqueue_scripts', function (): void {
    $header_enabled  = wd4_is_header_ad_enabled();
    $article_enabled = wd4_is_article_ads_enabled();

    if ( ! $header_enabled && ! $article_enabled ) {
        return;
    }

    $snippets = array( '.ad-wrap{contain:layout paint;display:block;width:100%;}' );

    if ( $article_enabled ) {
        $snippets[] = '.ad-inarticle .adsbygoogle{display:block;margin:0 auto;}';
        $snippets[] = '#asn-share-ad{--asn-share-height:var(--wd4-share-ad-height,clamp(320px,62vw,400px));min-height:var(--asn-share-height);}';
        $snippets[] = '#asn-share-ad .adsbygoogle{min-height:var(--asn-share-height);}';
    }

    if ( $header_enabled ) {
        $snippets[] = '#asn-header-ad{--asn-header-height:var(--wd4-header-ad-height,clamp(120px,18vw,160px));min-height:var(--asn-header-height);}';
        $snippets[] = '#asn-header-ad .adsbygoogle{min-height:var(--asn-header-height);}';
    }

    wp_register_style( 'asn-adsense-placement', false );
    wp_enqueue_style( 'asn-adsense-placement' );
    wp_add_inline_style( 'asn-adsense-placement', implode( ' ', $snippets ) );
}, 20 );



add_action( 'wp_head', function (): void {
    if ( is_admin() || is_feed() ) {
        return;
    }
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return;
    }
    if ( ! wd4_are_ads_enabled() ) {
        return;
    }
    echo "<script async src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9101284402640935' crossorigin='anonymous'></script>\n";
}, 5 );

add_action( 'init', function (): void {
    remove_action( 'wp_body_open', 'asn_header_top_adsense', 5 );
} );

add_action( 'template_redirect', function (): void {
    if ( is_admin() || is_feed() || is_robots() ) {
        return;
    }
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return;
    }

    $header_enabled  = wd4_is_header_ad_enabled();
    $article_enabled = wd4_is_article_ads_enabled();

    if ( ! $header_enabled && ! $article_enabled ) {
        return;
    }

    ob_start( function ( string $html ) use ( $header_enabled, $article_enabled ) {
        if ( $header_enabled && false === strpos( $html, 'id="asn-header-ad"' ) ) {
            $header_markup = <<<'HTML'
<div id="asn-header-ad" class="ad-wrap ad-header-center" style="--asn-header-height:var(--wd4-header-ad-height,clamp(120px,18vw,160px));min-height:var(--asn-header-height);">
  <div class="rb-container edge-padding">
    <ins class="adsbygoogle" style="display:block;width:100%;min-height:var(--asn-header-height);" data-ad-client="ca-pub-9101284402640935" data-ad-slot="6445109879" data-ad-format="horizontal" data-full-width-responsive="true"></ins>
  </div>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
HTML;
            $pattern = '/(<div\b[^>]*class=("|\')[^\2>]*\bsite-wrap\b[^\2>]*\2[^>]*>)/i';
            $html    = preg_replace( $pattern, $header_markup . '$1', $html, 1 ) ?: $html;
        }

        if ( $article_enabled && is_singular( array( 'post', 'page' ) ) && false === strpos( $html, 'id="asn-share-ad"' ) ) {
            $share_markup = <<<'HTML'
<div id="asn-share-ad" class="ad-wrap ad-below-post" style="--asn-share-height:var(--wd4-share-ad-height,clamp(320px,62vw,400px));min-height:var(--asn-share-height);margin:24px 0;">
  <div class="rb-container edge-padding">
    <ins class="adsbygoogle" style="display:block;width:100%;min-height:var(--asn-share-height);" data-ad-client="ca-pub-9101284402640935" data-ad-slot="8680390978" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </div>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
HTML;
            $pattern  = '/(<div\b[^>]*class=("|\')[^\2>]*\be-shared-sec\b[^\2>]*\bentry-sec\b[^\2>]*\2[^>]*>)/i';
            $replaced = preg_replace( $pattern, $share_markup . '$1', $html, 1 );
            $html     = $replaced ? $replaced : ( preg_replace( '/(<\/article>)/i', $share_markup . '$1', $html, 1 ) ?: $html );
        }

        return $html;
    } );
}, 1 );

add_action( 'template_redirect', function (): void {
    ob_start( function ( string $html ) {
        return preg_replace( '#<link[^>]*\srel=("|\')preload\1[^>]*\shref=("|\')[^"\']*foxiz/assets/fonts/icons\\.woff2[^"\']*\2[^>]*>#i', '', $html );
    } );
}, 0 );

add_action( 'shutdown', function (): void {
    while ( ob_get_level() > 0 ) {
        @ob_end_flush();
    }
}, PHP_INT_MAX );



/**
 * -------------------------------------------------------------------------
 * Foxiz block scripting helpers
 * -------------------------------------------------------------------------
 */
add_action( 'wp_head', function (): void {
    if ( is_admin() ) {
        return;
    }

    $params = array(
        'ajaxurl'         => admin_url( 'admin-ajax.php' ),
        'security'        => wp_create_nonce( 'foxiz-ajax' ),
        'darkModeID'      => 'RubyDarkMode',
        'yesPersonalized' => '',
        'cookieDomain'    => '',
        'cookiePath'      => '/',
    );

    $ui = array(
        'sliderSpeed'  => '5000',
        'sliderEffect' => 'slide',
        'sliderFMode'  => '1',
    );

    $core_script = 'var foxizCoreParams = ' . wp_json_encode( $params ) . ';';
    $ui_script   = 'window.foxizParams = ' . wp_json_encode( $ui ) . ';';

    if ( function_exists( 'wp_print_inline_script_tag' ) ) {
        echo wp_print_inline_script_tag( $core_script, array( 'id' => 'foxiz-core-js-extra' ) );
        echo wp_print_inline_script_tag( $ui_script, array( 'id' => 'foxiz-ui-js-extra' ) );
    } else {
        printf( '<script id="foxiz-core-js-extra">%s</script>', $core_script );
        printf( '<script id="foxiz-ui-js-extra">%s</script>', $ui_script );
    }
}, 1 );

function my_detect_view_context(): string {
    if ( is_front_page() || is_home() ) {
        return 'home';
    }
    if ( function_exists( 'is_product_category' ) && is_product_category() ) {
        return 'category';
    }
    if ( is_category() || is_tag() || is_tax() ) {
        return 'category';
    }
    if ( is_search() ) {
        return 'search';
    }
    if ( is_author() ) {
        return 'author';
    }
    if ( is_singular( 'post' ) ) {
        return 'post';
    }
    if ( is_page() ) {
        return 'page';
    }
    return 'other';
}

function my_get_allowed_js_handles_by_context( string $context ): array {
    $allowed = array(
        'home'     => array( 'main', 'pagination', 'lazy', 'foxiz-core-js', 'wd-defer-css' ),
        'category' => array( 'main', 'pagination', 'lazy', 'wd-defer-css' ),
        'search'   => array(),
        'author'   => array(),
        'post'     => array( 'comment', 'download', 'main', 'foxiz-core-js', 'lazy', 'pagination', 'foxiz-core', 'wd-defer-css' ),
        'page'     => array( 'comment', 'download', 'main', 'lazy', 'pagination', 'foxiz-core', 'wd-defer-css' ),
        'other'    => array(),
    );

    $list = $allowed[ $context ] ?? array();
    $list = array_values( array_unique( $list ) );

    return (array) apply_filters( 'my_allowed_js_handles', $list, $context );
}

function my_register_context_only_scripts(): void {
    $context = my_detect_view_context();

    $main          = 'https://aistudynow.com/wp-content/themes/js/main.js';
    $lazy          = 'https://aistudynow.com/wp-content/themes/js/lazy.js';
    $pagination_js = 'https://aistudynow.com/wp-content/themes/js/pagination.js';
    $foxiz_core    = 'https://aistudynow.com/wp-content/themes/js/core.js';
    $comment       = 'https://aistudynow.com/wp-content/themes/js/comment.js';
    $download      = 'https://aistudynow.com/wp-content/plugins/newsletter-11/assets/js/download-form-validation.js';
    $core_js       = 'https://aistudynow.com/wp-content/themes/js/core.js';
    $defer_js      = 'https://aistudynow.com/wp-content/themes/js/defer-css.js';
  

    if ( 'home' === $context ) {
        wp_enqueue_script( 'main', $main, array(), '1.0.0', true );
        wp_enqueue_script( 'pagination', $pagination_js, array(), '1.0.1', true );
        wp_enqueue_script( 'wd-defer-css', $defer_js, array(), '2.0.0', true );

        $home_block_globals = <<<'JS'
var uid_cfc8f6c = {"uuid":"uid_cfc8f6c","category":"208","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392","paged":"1","page_max":"1"};
var uid_0d9c5d1 = {"uuid":"uid_0d9c5d1","category":"212","name":"grid_flex_2","order":"date_post","posts_per_page":"8","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180","paged":"1","page_max":"4"};
var uid_c9675dd = {"uuid":"uid_c9675dd","category":"209","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180,5328,5291,5257,5239,5216,5192,5151,5124","paged":"1","page_max":"1"};
var uid_1c5cfd6 = {"uuid":"uid_1c5cfd6","category":"215","name":"grid_flex_2","order":"date_post","posts_per_page":"12","pagination":"load_more","unique":"1","crop_size":"foxiz_crop_g1","entry_category":"bg-4","title_tag":"h2","entry_meta":["author","category"],"review_meta":"-1","excerpt_source":"tagline","readmore":"Read More","block_structure":"thumbnail, meta, title","divider_style":"solid","post_not_in":"5403,5400,5395,5392,5374,5306,5210,5180,5328,5291,5257,5239,5216,5192,5151,5124,5080,5077,4925,4914,4580","paged":"1","page_max":"1"};
JS;
        wp_add_inline_script( 'pagination', $home_block_globals, 'before' );
        return;
    }

    if ( 'category' === $context ) {
        wp_enqueue_script( 'main', $main, array(), '4.0.0', true );
        wp_enqueue_script( 'pagination', $pagination_js, array(), '1.0.1', true );
        wp_enqueue_script( 'wd-defer-css', $defer_js, array(), '2.0.0', true );

        global $wp_query;
        $qo             = get_queried_object();
        $taxonomy       = isset( $qo->taxonomy ) ? $qo->taxonomy : 'category';
        $term_id        = isset( $qo->term_id ) ? (int) $qo->term_id : 0;
        $page_max       = (int) ( $wp_query ? $wp_query->max_num_pages : 1 );
        $posts_per_page = (int) get_query_var( 'posts_per_page', get_option( 'posts_per_page' ) );
        $paged          = (int) max( 1, get_query_var( 'paged' ) );

        $settings = array(
            'uuid'            => null,
            'name'            => 'grid_flex_2',
            'order'           => 'date_post',
            'posts_per_page'  => (string) $posts_per_page,
            'pagination'      => null,
            'unique'          => '1',
            'crop_size'       => 'foxiz_crop_g1',
            'entry_category'  => 'bg-4',
            'title_tag'       => 'h2',
            'entry_meta'      => array( 'author', 'category' ),
            'review_meta'     => '-1',
            'excerpt_source'  => 'tagline',
            'readmore'        => 'Read More',
            'block_structure' => 'thumbnail, meta, title',
            'divider_style'   => 'solid',
            'entry_tax'       => $taxonomy,
            'category'        => (string) $term_id,
            'paged'           => (string) $paged,
            'page_max'        => (string) $page_max,
        );

        wp_add_inline_script( 'pagination', 'var foxizCoreParams = ' . wp_json_encode( array( 'ajaxurl' => admin_url( 'admin-ajax.php' ), 'security' => wp_create_nonce( 'foxiz-ajax' ) ) ) . ';', 'before' );
        wp_add_inline_script( 'pagination', 'window.foxizParams = ' . wp_json_encode( array( 'sliderSpeed' => '5000', 'sliderEffect' => 'slide', 'sliderFMode' => '1' ) ) . ';', 'before' );

        $bootstrap = sprintf(
            <<<'JS'
(function(){
  var btn = document.querySelector('.pagination-wrap .loadmore-trigger');
  var block = (btn && (btn.closest('.block-wrap') || btn.closest('.archive-block') || btn.closest('.site-main'))) || document.querySelector('.block-wrap, .archive-block, .site-main');
  if (!block) return;
  if (!block.id) {
    block.id = 'uid_' + Math.random().toString(36).slice(2, 9);
  }
  var settings = %s;
  settings.uuid = block.id;
  var hasLoadMoreBtn = !!document.querySelector('.pagination-wrap .loadmore-trigger');
  var hasSentinel    = !!block.querySelector('.pagination-infinite');
  var mode = hasLoadMoreBtn ? 'load_more' : (hasSentinel ? 'infinite_scroll' : 'infinite_scroll');
  settings.pagination = mode;
  window[block.id] = settings;
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
    if (wrap) {
      wrap.style.display = 'none';
    }
  }
})();
JS,
            wp_json_encode( $settings )
        );

        wp_add_inline_script( 'pagination', $bootstrap, 'before' );
        return;
    }

    if ( in_array( $context, array( 'post', 'page' ), true ) ) {
        wp_enqueue_script( 'comment', $comment, array(), '1.0.0', true );
        wp_enqueue_script( 'main', $main, array(), '2.0.0', true );
        wp_enqueue_script( 'lazy', $lazy, array(), '2.0.0', true );
        wp_enqueue_script( 'pagination', $pagination_js, array(), '5.0.1', true );
        wp_enqueue_script( 'download', $download, array(), '1.0.0', true );
        wp_enqueue_script( 'foxiz-core-js', $foxiz_core, array(), '1.0.0', true );
        wp_enqueue_script( 'wd-defer-css', $defer_js, array(), '2.0.0', true );
    }
}
add_action( 'wp_enqueue_scripts', 'my_register_context_only_scripts', 20 );


function wd4_mark_core_script_deferred(): void {
    if ( is_admin() ) {
        return;
    }

    if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
        return;
    }

    if ( function_exists( 'wp_script_add_data' ) && wp_script_is( 'foxiz-core', 'registered' ) ) {
        wp_script_add_data( 'foxiz-core', 'defer', true );
    }
}
add_action( 'wp_enqueue_scripts', 'wd4_mark_core_script_deferred', 40 );



function my_disable_all_js_except_whitelisted(): void {
    if ( is_admin() || wp_doing_ajax() ) {
        return;
    }

    global $wp_scripts;
    if ( ! ( $wp_scripts instanceof WP_Scripts ) ) {
        return;
    }

    $context = my_detect_view_context();
    $targets = array( 'home', 'category', 'search', 'author', 'post', 'page' );
    if ( ! in_array( $context, $targets, true ) ) {
        return;
    }

    $allowed = array_values( array_unique( array_filter( my_get_allowed_js_handles_by_context( $context ), 'strlen' ) ) );

    foreach ( (array) $wp_scripts->queue as $handle ) {
        if ( ! in_array( $handle, $allowed, true ) ) {
            wp_dequeue_script( $handle );
            wp_deregister_script( $handle );
        }
    }

    add_action( 'wp_print_scripts', function () use ( $allowed ): void {
        global $wp_scripts;
        if ( ! $wp_scripts ) {
            return;
        }
        foreach ( (array) $wp_scripts->queue as $handle ) {
            if ( ! in_array( $handle, $allowed, true ) ) {
                wp_dequeue_script( $handle );
                wp_deregister_script( $handle );
            }
        }
    }, PHP_INT_MAX );

    add_action( 'wp_print_footer_scripts', function () use ( $allowed ): void {
        global $wp_scripts;
        if ( ! $wp_scripts ) {
            return;
        }
        foreach ( (array) $wp_scripts->queue as $handle ) {
            if ( ! in_array( $handle, $allowed, true ) ) {
                wp_dequeue_script( $handle );
                wp_deregister_script( $handle );
            }
        }
    }, PHP_INT_MAX );
}
add_action( 'wp_enqueue_scripts', 'my_disable_all_js_except_whitelisted', PHP_INT_MAX );

add_filter( 'script_loader_tag', function ( string $tag, string $handle, string $src ) {
    if ( is_admin() || wp_doing_ajax() ) {
        return $tag;
    }
    $context = my_detect_view_context();
    $targets = array( 'home', 'category', 'search', 'author', 'post', 'page' );
    if ( ! in_array( $context, $targets, true ) ) {
        return $tag;
    }
    $allowed = my_get_allowed_js_handles_by_context( $context );
    if ( ! in_array( $handle, $allowed, true ) ) {
        return '';
    }

    if ( 'foxiz-core' === $handle && false === stripos( $tag, ' defer' ) ) {
        $updated = preg_replace( '/<script\s+/i', '<script defer ', $tag, 1 );
        if ( null !== $updated ) {
            $tag = $updated;
        } else {
            $tag = str_replace( '<script', '<script defer', $tag );
        }
    }

    return $tag;
}, PHP_INT_MAX, 3 );





/**
 * -------------------------------------------------------------------------
 * Misc integrations
 * -------------------------------------------------------------------------
 */
function vdoai_after_first_paragraph( string $content ): string {
    static $vdoai_injected = false;

    if ( $vdoai_injected ) {
        return $content;
    }

    if ( is_admin() || is_feed() || is_search() || is_archive() || is_front_page() || is_home() ) {
        return $content;
    }
    if ( ! in_the_loop() || ! is_main_query() || ! is_singular( array( 'post', 'page' ) ) ) {
        return $content;
    }
    if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
        return $content;
    }
    if ( strpos( $content, 'id="v-aistudynow"' ) !== false ) {
        return $content;
    }

    $snippet = <<<'HTML'
<div id="v-aistudynow"></div>
<script data-cfasync="false">(function(v,d,o,ai){ai=d.createElement('script');ai.defer=true;ai.async=true;ai.src=v.location.protocol+o;d.head.appendChild(ai);})(window, document, '//a.vdo.ai/core/v-aistudynow/vdo.ai.js');</script>
HTML;

    $closing_p = '</p>';
    $pos       = strpos( $content, $closing_p );

    $output = ( false !== $pos )
        ? substr( $content, 0, $pos + strlen( $closing_p ) ) . $snippet . substr( $content, $pos + strlen( $closing_p ) )
        : $content . $snippet;

    $vdoai_injected = true;

    return $output;
}
add_filter( 'the_content', 'vdoai_after_first_paragraph', 20 );


add_action( 'wp_footer', function (): void {
    ?>
    <script>
    (function(){
      var body = document.body;
      if (!body) {
        return;
      }
      if (body.getAttribute('aria-hidden') === 'true') {
        body.removeAttribute('aria-hidden');
      }
      var obs = new MutationObserver(function(mutations){
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'attributes' && m.attributeName === 'aria-hidden' && body.getAttribute('aria-hidden') === 'true') {
            body.removeAttribute('aria-hidden');
          }
        }
      });
      obs.observe(body, { attributes: true, attributeFilter: ['aria-hidden'] });
    })();
    </script>
    <?php
}, 100 );

function allow_json_mime( array $mimes ): array {
    $mimes['json'] = 'application/json';
    return $mimes;
}
add_filter( 'upload_mimes', 'allow_json_mime' );