/*
 * The bridge is thin on purpose: one JSON string down, decoded only when it changes, and the view's height back. The
 * hosting controller joins the React view controller once in a window, so SwiftUI has a parent for its environment;
 * Fabric recycles views, so `prepareForRecycle` empties the store.
 */
#import "MPHeroView.h"

#import <React/UIView+React.h>
#import <react/renderer/components/MyPaisaShellSpec/ComponentDescriptors.h>
#import <react/renderer/components/MyPaisaShellSpec/EventEmitters.h>
#import <react/renderer/components/MyPaisaShellSpec/Props.h>
#import <react/renderer/components/MyPaisaShellSpec/RCTComponentViewHelpers.h>

#import "MPSwift.h"

using namespace facebook::react;

@interface MPHeroView () <RCTMPHeroViewProtocol>
@end

@implementation MPHeroView {
  MPHeroHost *_host;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<MPHeroComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const MPHeroProps>();
    _props = defaultProps;
    _host = [[MPHeroHost alloc] init];
    __weak MPHeroView *weakSelf = self;
    _host.onHeight = ^(double height) {
      [weakSelf emitHeight:height];
    };
    self.contentView = _host.view;
  }
  return self;
}

- (void)emitHeight:(double)height
{
  if (!_eventEmitter) {
    return;
  }
  std::static_pointer_cast<const MPHeroEventEmitter>(_eventEmitter)->onHeight({.height = height});
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = *std::static_pointer_cast<const MPHeroProps>(props);
  const auto &prev = *std::static_pointer_cast<const MPHeroProps>(_props);
  if (next.model != prev.model) {
    [_host applyWithModelJSON:[NSString stringWithUTF8String:next.model.c_str()]];
  }
  [super updateProps:props oldProps:oldProps];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  UIViewController *parent = self.reactViewController;
  UIViewController *child = _host.viewController;
  if (self.window && parent && child.parentViewController != parent) {
    [parent addChildViewController:child];
    [child didMoveToParentViewController:parent];
  }
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_host reset];
}

@end

Class<RCTComponentViewProtocol> MPHeroCls(void)
{
  return MPHeroView.class;
}
