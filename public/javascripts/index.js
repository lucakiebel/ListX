/*!
 * Start Bootstrap - Grayscale Bootstrap Theme (http://startbootstrap.com)
 * Code licensed under the Apache License v2.0.
 * For details, see http://www.apache.org/licenses/LICENSE-2.0.
 */

// jQuery to collapse the navbar on scroll
function collapseNavbar() {
    if ($(".navbar").offset().top > 50) {
        $(".navbar-fixed-top").addClass("top-nav-collapse");
        $(".color-visible").css("color", "black");
    } else {
        $(".navbar-fixed-top").removeClass("top-nav-collapse");
        $(".color-visible").css("color", "white");
    }
}

$(window).scroll(collapseNavbar);
$(document).ready(collapseNavbar);

// jQuery for page scrolling feature - requires jQuery Easing plugin
$(function() {
    $('a.page-scroll').bind('click', function(event) {
        let $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1800, 'easeInOutExpo');
        event.preventDefault();
    });

    if (/Mobi/i.test(navigator.userAgent)) {
        // device is mobile (we don't need mobile version on tablets)
        $("#companyLogo").removeClass("pull-right");
        $("#companyLogoDiv").removeClass("text-right");
        $("#footer").removeClass("footer-desktop");
        $("#user-interaction-navbar").removeClass("navbar-right")
            .addClass("navbar-center")
            .css("float", "none");
        $("#footer-brand").css("display", "none")
    }
});


// Closes the Responsive Menu on Menu Item Click
$('.navbar-collapse ul li a').click(function() {
    $(".navbar-collapse").collapse('hide');
});


