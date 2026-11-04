#import "MPTabBarView.h"

#import <react/renderer/components/MyPaisaShellSpec/ComponentDescriptors.h>
#import <react/renderer/components/MyPaisaShellSpec/EventEmitters.h>
#import <react/renderer/components/MyPaisaShellSpec/Props.h>
#import <react/renderer/components/MyPaisaShellSpec/RCTComponentViewHelpers.h>

#import "MPSwift.h"

using namespace facebook::react;

@interface MPTabBarView () <RCTMPTabBarViewProtocol, UITabBarDelegate>
@end

@implementation MPTabBarView {
  UITabBar *_bar;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<MPTabBarComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const MPTabBarProps>();
    _props = defaultProps;
    _bar = [[UITabBar alloc] initWithFrame:self.bounds];
    _bar.delegate = self;
    _bar.tintColor = MPTheme.accent;
    self.contentView = _bar;
  }
  return self;
}

/// `TabItem[]` as JSON. A list that cannot be read leaves the bar as it was; the Jest tests hold what the shell sends.
- (void)applyItems:(NSString *)json
{
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  NSArray<NSDictionary *> *entries = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  if (![entries isKindOfClass:NSArray.class]) {
    return;
  }
  NSMutableArray<UITabBarItem *> *items = [NSMutableArray arrayWithCapacity:entries.count];
  [entries enumerateObjectsUsingBlock:^(NSDictionary *entry, NSUInteger index, BOOL *stop) {
    UITabBarItem *item = [[UITabBarItem alloc] initWithTitle:entry[@"title"]
                                                       image:[UIImage systemImageNamed:entry[@"symbol"]]
                                                         tag:(NSInteger)index];
    item.accessibilityIdentifier = entry[@"testID"];
    [items addObject:item];
  }];
  _bar.items = items;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &next = *std::static_pointer_cast<const MPTabBarProps>(props);
  const auto &prev = *std::static_pointer_cast<const MPTabBarProps>(_props);
  if (next.items != prev.items) {
    [self applyItems:[NSString stringWithUTF8String:next.items.c_str()]];
  }
  NSInteger selected = next.selected;
  if (selected >= 0 && selected < (NSInteger)_bar.items.count) {
    _bar.selectedItem = _bar.items[selected];
  }
  [super updateProps:props oldProps:oldProps];
}

- (void)tabBar:(UITabBar *)tabBar didSelectItem:(UITabBarItem *)item
{
  if (!_eventEmitter) {
    return;
  }
  std::static_pointer_cast<const MPTabBarEventEmitter>(_eventEmitter)->onSelectTab({.index = (int)item.tag});
}

@end

Class<RCTComponentViewProtocol> MPTabBarCls(void)
{
  return MPTabBarView.class;
}
