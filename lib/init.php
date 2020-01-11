<?php

namespace GatsbyWordpressGutenberg;

if (!class_exists('GatsbyWordpressGutenberg')) {
  final class GatsbyWordpressGutenberg
  {
    private static $instance;
    public static function instance()
    {
      if (!isset(self::$instance)) {
        self::$instance = new GatsbyWordpressGutenberg();
      }

      return self::$instance;
    }

    public function setup()
    {
      new \GatsbyWordpressGutenberg\Graphql\TypeRegistrator();
    }
  }
}

GatsbyWordpressGutenberg::instance()->setup();
