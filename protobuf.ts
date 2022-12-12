import { AddressBook, Person_PhoneType } from './generated/addressBook.js'

const myAddressBook: AddressBook = {
    people: [
        {
            name: "Joe Blogs",
            phones: [
                {
                    phoneNumber: "0123456789",
                    phoneType: Person_PhoneType.MOBILE
                }
            ]
        },
        {
            name: "Jane Smith",
            phones: [
                {
                    phoneNumber: "0987654321",
                    phoneType: Person_PhoneType.HOME
                }
            ]
        }
    ]
}

export const testProtoBuf = async () => {
    const encoded = AddressBook.encode(myAddressBook).finish()
    console.log(encoded)
    const decoded = AddressBook.decode(encoded)
    console.log(decoded)
}