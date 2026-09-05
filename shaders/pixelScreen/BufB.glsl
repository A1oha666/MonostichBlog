// pixelScreen - Buf B
//
// First 4x reduction pass for bloom and anamorphic flare.
//
// Created by Dmitry Andreev - and'2016
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    fragColor = vec4(0);
    vec2  res = iChannelResolution[0].xy;
    float s = res.y / 450.0;

    // Discard pixels outside of working area for performance.
    if (fragCoord.x > (res.x + 3.0) / 4.0) discard;

    // Horizontal reduction for anamorphic flare.
    for (int x = 0; x < 8; x++)
    {
        fragColor.z += 0.25 * texture(iChannel0, min(vec2(1.0, 1.0),
            vec2(4.0, 1.0) * (fragCoord + 0.5 * s * vec2(float(x) - 3.5, 0)) / res)).z;
    }

    if (fragCoord.y <= (iChannelResolution[0].y + 3.0) / 4.0)
    {
        // Horizontal and vertical reduction for regular bloom.

        for (int y = 0; y < 5; y++)
        for (int x = 0; x < 5; x++)
        {
            fragColor.y += 0.04 * texture(iChannel0, min(vec2(1.0),
                (4.0 * (floor(fragCoord) + s * (vec2(x,y) - 2.0))) / res)).y;
        }
    }
}
