const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxImageBytes = 2 * 1024 * 1024;

function parseAndValidateAttachment(attachment) {
  if (attachment === null) return null;
  if (attachment === undefined) return undefined;
  if (
    typeof attachment !== 'object' ||
    !imageTypes.includes(attachment.contentType) ||
    typeof attachment.data !== 'string' ||
    typeof attachment.originalName !== 'string' ||
    attachment.originalName.length > 160
  ) {
    throw new Error('Upload a valid JPG, PNG, WEBP, or GIF image.');
  }
  const imageMatch = attachment.data.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!imageMatch || imageMatch[1] !== attachment.contentType) {
    throw new Error('The image attachment could not be validated.');
  }
  const imageBytes = Buffer.from(imageMatch[2], 'base64');
  if (!imageBytes.length || imageBytes.length > maxImageBytes) {
    throw new Error('Image size must be 2 MB or less.');
  }
  return {
    data: `data:${attachment.contentType};base64,${imageBytes.toString('base64')}`,
    contentType: attachment.contentType,
    originalName: attachment.originalName,
  };
}

module.exports = {
  parseAndValidateAttachment,
  imageTypes,
  maxImageBytes,
};
